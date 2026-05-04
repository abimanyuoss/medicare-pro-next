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
        ["No", "Pasien", "Layanan", "Dokter", "Tanggal", "Jumlah"],
        ...monthTransactions.map((tx) => [
          tx.code,
          tx.patientName,
          tx.service.name,
          tx.doctor.name,
          tx.date,
          Number(tx.amount),
        ]),
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
