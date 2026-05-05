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
import {
  accountingWorkbook,
  blankRow,
  creditCell,
  dateCell,
  debitCell,
  type ExcelSheet,
  headerCell,
  moneyCell,
  numberCell,
  sectionRow,
  statusCell,
  subtitleRow,
  textCell,
  titleRow,
  totalLabelCell,
  totalMoneyCell,
  totalNumberCell,
  typeCell,
} from "@/lib/excel-workbook";

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

  const monthTransactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: getStartOfMonth(),
      },
    },
    orderBy: {
      date: "asc",
    },
    include: {
      service: true,
      doctor: true,
    },
  });

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
  const periodLabel = new Date().toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const exportDate = new Date();
  let runningBalance = 0;
  const journalRows = monthTransactions.map((tx) => {
    const amount = Number(tx.amount);
    const ledger = ledgerEntry(tx.status, amount);
    runningBalance += ledger.debit - ledger.credit;

    return [
      dateCell(tx.date),
      textCell(tx.code),
      textCell(`${tx.patientName} - ${tx.service.name}`),
      textCell(ledger.type === "Debit" ? "Kas" : ledger.type === "Kredit" ? "Piutang" : "Batal"),
      debitCell(ledger.debit),
      creditCell(ledger.credit),
      moneyCell(runningBalance),
      statusCell(tx.status.replace("_", " ")),
    ];
  });

  const sheets: ExcelSheet[] = [
    {
      name: "Ringkasan",
      columns: [190, 135, 280],
      rows: [
        titleRow("Laporan Akuntansi MediCare Pro", 2),
        subtitleRow(`Periode ${periodLabel} | Dicetak ${formatDate(exportDate)}`, 2),
        blankRow(),
        sectionRow("Ringkasan Utama", 2),
        [headerCell("Metrik"), headerCell("Nilai"), headerCell("Catatan")],
        [textCell("Transaksi Bulan Ini"), numberCell(monthTransactions.length), textCell("Semua status")],
        [textCell("Pendapatan Bulan Ini"), moneyCell(monthlyRevenue), textCell("Hanya transaksi lunas")],
        [textCell("Total Debit (Lunas)"), debitCell(monthlyDebit), textCell("Pembayaran lunas / uang masuk")],
        [textCell("Total Kredit (Belum Lunas)"), creditCell(monthlyCredit), textCell("Tagihan belum lunas")],
        [textCell("Transaksi Batal"), numberCell(canceledTransactions), textCell("Tidak masuk debit/kredit")],
        [textCell("Layanan Terpopuler"), textCell(serviceData[0]?.name ?? "-"), textCell("Berdasarkan jumlah kunjungan")],
      ],
    },
    {
      name: "Kunjungan Layanan",
      columns: [220, 120],
      rows: [
        titleRow("Kunjungan per Layanan", 1),
        subtitleRow(`Periode ${periodLabel}`, 1),
        blankRow(),
        [headerCell("Layanan"), headerCell("Jumlah Kunjungan")],
        ...serviceData.map((item) => [textCell(item.name), numberCell(item.value)]),
        [totalLabelCell("TOTAL"), totalNumberCell(serviceData.reduce((sum, item) => sum + item.value, 0))],
      ],
    },
    {
      name: "Performa Dokter",
      columns: [240, 150],
      rows: [
        titleRow("Performa Dokter", 1),
        subtitleRow(`Pendapatan lunas periode ${periodLabel}`, 1),
        blankRow(),
        [headerCell("Dokter"), headerCell("Pendapatan Bulan Ini")],
        ...doctorRevenue.map((item) => [textCell(item.name), moneyCell(item.pendapatan)]),
        [totalLabelCell("TOTAL"), totalMoneyCell(monthlyRevenue)],
      ],
    },
    {
      name: "Jurnal Keuangan",
      columns: [95, 125, 280, 100, 120, 120, 120, 95],
      rows: [
        titleRow("Jurnal Keuangan", 7),
        subtitleRow("Format debit/kredit dengan saldo berjalan", 7),
        blankRow(),
        [
          headerCell("Tanggal"),
          headerCell("No Bukti"),
          headerCell("Keterangan"),
          headerCell("Akun"),
          headerCell("Debit"),
          headerCell("Kredit"),
          headerCell("Saldo"),
          headerCell("Status"),
        ],
        ...journalRows,
        [
          textCell(""),
          textCell(""),
          textCell(""),
          totalLabelCell("TOTAL"),
          totalMoneyCell(monthlyDebit),
          totalMoneyCell(monthlyCredit),
          totalMoneyCell(runningBalance),
          textCell(""),
        ],
      ],
    },
    {
      name: "Detail Transaksi",
      columns: [125, 145, 175, 200, 95, 105, 85, 120, 120, 120],
      rows: [
        titleRow("Detail Transaksi Bulan Ini", 9),
        subtitleRow("Kolom debit/kredit mengikuti status pembayaran transaksi", 9),
        blankRow(),
        [
          headerCell("No"),
          headerCell("Pasien"),
          headerCell("Layanan"),
          headerCell("Dokter"),
          headerCell("Tanggal"),
          headerCell("Status"),
          headerCell("Jenis"),
          headerCell("Debit"),
          headerCell("Kredit"),
          headerCell("Jumlah"),
        ],
        ...monthTransactions.map((tx) => {
          const amount = Number(tx.amount);
          const ledger = ledgerEntry(tx.status, amount);

          return [
            textCell(tx.code),
            textCell(tx.patientName),
            textCell(tx.service.name),
            textCell(tx.doctor.name),
            dateCell(tx.date),
            statusCell(tx.status.replace("_", " ")),
            typeCell(ledger.type),
            debitCell(ledger.debit),
            creditCell(ledger.credit),
            moneyCell(amount),
          ];
        }),
        [
          textCell(""),
          textCell(""),
          textCell(""),
          textCell(""),
          textCell(""),
          textCell(""),
          totalLabelCell("TOTAL"),
          totalMoneyCell(monthlyDebit),
          totalMoneyCell(monthlyCredit),
          totalMoneyCell(monthlyDebit + monthlyCredit),
        ],
      ],
    },
  ];

  const file = accountingWorkbook(sheets);
  const filename = `laporan-medicare-pro-${new Date().toISOString().slice(0, 10)}.xls`;

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
