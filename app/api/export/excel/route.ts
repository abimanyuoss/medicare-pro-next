import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth";
import { formatDate, getStartOfMonth } from "@/lib/format";
import {
  groupRevenueByDoctor,
  groupServiceDistribution,
} from "@/lib/analytics";

type CellValue = string | number | Date | null | undefined;
type Sheet = {
  name: string;
  rows: CellValue[][];
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sheetName(name: string) {
  return escapeXml(name.slice(0, 31));
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

function worksheet(sheet: Sheet) {
  const rows = sheet.rows
    .map((row) => `<Row>${row.map(cell).join("")}</Row>`)
    .join("");

  return `<Worksheet ss:Name="${sheetName(sheet.name)}"><Table>${rows}</Table></Worksheet>`;
}

function workbook(sheets: Sheet[]) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
  </Styles>
  ${sheets.map(worksheet).join("")}
</Workbook>`;
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

export async function GET() {
  const isAuthenticated = await verifySessionToken(
    cookies().get(getSessionCookieName())?.value
  );

  if (!isAuthenticated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [
    monthTransactions,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        date: {
          gte: getStartOfMonth(),
        },
      },
      include: {
        service: true,
        doctor: true,
      },
    }),
  ]);

  const monthlyRevenue = monthTransactions
    .filter((tx) => tx.status === TransactionStatus.LUNAS)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const monthlyDebit = monthTransactions.reduce(
    (sum, tx) => sum + ledgerEntry(tx.status, Number(tx.amount)).debit,
    0
  );
  const monthlyCredit = monthTransactions.reduce(
    (sum, tx) => sum + ledgerEntry(tx.status, Number(tx.amount)).credit,
    0
  );
  const canceledTransactions = monthTransactions.filter(
    (tx) => tx.status === TransactionStatus.BATAL
  ).length;
  const serviceData = groupServiceDistribution(monthTransactions);
  const doctorRevenue = groupRevenueByDoctor(monthTransactions);

  const sheets: Sheet[] = [
    {
      name: "Ringkasan",
      rows: [
        ["Metrik", "Nilai"],
        ["Tanggal Export", formatDate(new Date())],
        [
          "Periode",
          new Date().toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          }),
        ],
        ["Transaksi Bulan Ini", monthTransactions.length],
        ["Pendapatan Bulan Ini", monthlyRevenue],
        ["Total Debit (Lunas)", monthlyDebit],
        ["Total Kredit (Belum Lunas)", monthlyCredit],
        ["Transaksi Batal", canceledTransactions],
        ["Keterangan Debit", "Pembayaran lunas / uang masuk"],
        ["Keterangan Kredit", "Tagihan belum lunas"],
        ["Layanan Terpopuler", serviceData[0]?.name ?? "-"],
      ],
    },
    {
      name: "Kunjungan Layanan",
      rows: [
        ["Layanan", "Jumlah Kunjungan"],
        ...serviceData.map((item) => [item.name, item.value]),
      ],
    },
    {
      name: "Performa Dokter",
      rows: [
        ["Dokter", "Pendapatan Bulan Ini"],
        ...doctorRevenue.map((item) => [item.name, item.pendapatan]),
      ],
    },
    {
      name: "Detail Transaksi",
      rows: [
        [
          "No",
          "Pasien",
          "Layanan",
          "Dokter",
          "Tanggal",
          "Status",
          "Jenis",
          "Debit",
          "Kredit",
          "Jumlah",
        ],
        ...monthTransactions.map((tx) => {
          const amount = Number(tx.amount);
          const ledger = ledgerEntry(tx.status, amount);

          return [
            tx.code,
            tx.patientName,
            tx.service.name,
            tx.doctor.name,
            tx.date,
            tx.status.replace("_", " "),
            ledger.type,
            ledger.debit,
            ledger.credit,
            amount,
          ];
        }),
      ],
    },
  ];

  const file = workbook(sheets);
  const filename = `laporan-medicare-pro-${new Date().toISOString().slice(0, 10)}.xls`;

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
