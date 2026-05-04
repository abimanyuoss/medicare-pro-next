import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
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
  const file = workbook([
    {
      name: "Ringkasan",
      rows: [
        ["Metrik", "Nilai"],
        ["Tanggal Export", formatDate(new Date())],
        ["Total Transaksi", transactions.length],
        ["Total Nominal", totalRevenue],
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
          "Jumlah",
          "Catatan",
        ],
        ...transactions.map((transaction) => [
          transaction.code,
          transaction.date,
          transaction.patientName,
          transaction.complaint,
          transaction.service.name,
          transaction.doctor.name,
          transaction.status.replace("_", " "),
          Number(transaction.amount),
          transaction.notes,
        ]),
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
