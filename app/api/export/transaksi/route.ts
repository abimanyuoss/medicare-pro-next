import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { parseTransactionFilters, type TransactionFilterParams } from "@/lib/transaction-filters";

type CellValue = string | number | Date | null | undefined;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cell(value: CellValue) {
  if (value instanceof Date) {
    return `<Cell><Data ss:Type="String">${escapeXml(formatDate(value))}</Data></Cell>`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }

  return `<Cell><Data ss:Type="String">${escapeXml(String(value ?? ""))}</Data></Cell>`;
}

function worksheet(name: string, rows: CellValue[][]) {
  const tableRows = rows
    .map((row) => `<Row>${row.map(cell).join("")}</Row>`)
    .join("");

  return `<Worksheet ss:Name="${escapeXml(name.slice(0, 31))}"><Table>${tableRows}</Table></Worksheet>`;
}

function workbook(sheets: { name: string; rows: CellValue[][] }[]) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  ${sheets.map((sheet) => worksheet(sheet.name, sheet.rows)).join("")}
</Workbook>`;
}

function searchParamsToObject(searchParams: URLSearchParams): TransactionFilterParams {
  return {
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    doctorId: searchParams.get("doctorId") ?? undefined,
    serviceId: searchParams.get("serviceId") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  };
}

function ledgerEntry(status: TransactionStatus, amount: number) {
  if (status === TransactionStatus.LUNAS) {
    return {
      type: "Debit",
      debit: amount,
      credit: 0,
    };
  }

  if (status === TransactionStatus.BELUM_LUNAS) {
    return {
      type: "Kredit",
      debit: 0,
      credit: amount,
    };
  }

  return {
    type: "Batal",
    debit: 0,
    credit: 0,
  };
}

export async function GET(request: NextRequest) {
  const isAuthenticated = await verifySessionToken(
    cookies().get(getSessionCookieName())?.value
  );

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const filters = parseTransactionFilters(
    searchParamsToObject(request.nextUrl.searchParams)
  );
  const transactions = await prisma.transaction.findMany({
    where: filters.where,
    orderBy: {
      date: "desc",
    },
    include: {
      doctor: true,
      service: true,
      medicines: {
        include: {
          medicine: true,
        },
      },
    },
  });

  const totalRevenue = transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );
  const totalDebit = transactions.reduce(
    (sum, transaction) =>
      sum + ledgerEntry(transaction.status, Number(transaction.amount)).debit,
    0
  );
  const totalCredit = transactions.reduce(
    (sum, transaction) =>
      sum + ledgerEntry(transaction.status, Number(transaction.amount)).credit,
    0
  );
  const file = workbook([
    {
      name: "Ringkasan",
      rows: [
        ["Metrik", "Nilai"],
        ["Tanggal Export", formatDate(new Date())],
        ["Total Transaksi", transactions.length],
        ["Total Nominal", totalRevenue],
        ["Total Debit (Lunas)", totalDebit],
        ["Total Kredit (Belum Lunas)", totalCredit],
        ["Keterangan Debit", "Pembayaran lunas / uang masuk"],
        ["Keterangan Kredit", "Tagihan belum lunas"],
        ["Pencarian", filters.searchQuery || "-"],
        ["Status", filters.statusFilter || "-"],
        ["Tanggal Awal", filters.dateFrom || "-"],
        ["Tanggal Akhir", filters.dateTo || "-"],
      ],
    },
    {
      name: "Transaksi",
      rows: [
        [
          "Kode",
          "Tanggal",
          "Pasien",
          "Keluhan",
          "Layanan",
          "Dokter",
          "Status",
          "Jenis",
          "Debit",
          "Kredit",
          "Jumlah",
          "Catatan",
        ],
        ...transactions.map((transaction) => {
          const amount = Number(transaction.amount);
          const ledger = ledgerEntry(transaction.status, amount);

          return [
            transaction.code,
            transaction.date,
            transaction.patientName,
            transaction.complaint,
            transaction.service.name,
            transaction.doctor.name,
            transaction.status.replace("_", " "),
            ledger.type,
            ledger.debit,
            ledger.credit,
            amount,
            transaction.notes,
          ];
        }),
      ],
    },
    {
      name: "Obat Transaksi",
      rows: [
        ["Kode Transaksi", "Pasien", "Obat", "Dosis", "Jumlah", "Harga Satuan"],
        ...transactions.flatMap((transaction) =>
          transaction.medicines.map((item) => [
            transaction.code,
            transaction.patientName,
            item.medicine.name,
            item.medicine.dosage,
            item.quantity,
            Number(item.price),
          ])
        ),
      ],
    },
  ]);
  const filename = `transaksi-filter-${new Date().toISOString().slice(0, 10)}.xls`;

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
