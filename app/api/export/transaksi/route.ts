import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { parseTransactionFilters, type TransactionFilterParams } from "@/lib/transaction-filters";
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
  const totalRevenue = totalDebit + totalCredit;
  const canceledCount = transactions.filter(
    (transaction) => transaction.status === TransactionStatus.BATAL
  ).length;
  const exportDate = new Date();
  const filterSummary = [
    filters.searchQuery ? `Pencarian: ${filters.searchQuery}` : null,
    filters.statusFilter ? `Status: ${filters.statusFilter}` : null,
    filters.dateFrom ? `Dari: ${filters.dateFrom}` : null,
    filters.dateTo ? `Sampai: ${filters.dateTo}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
  const ledgerTransactions = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  let runningBalance = 0;
  const journalRows = ledgerTransactions.map((transaction) => {
    const amount = Number(transaction.amount);
    const ledger = ledgerEntry(transaction.status, amount);
    runningBalance += ledger.debit - ledger.credit;

    return [
      dateCell(transaction.date),
      textCell(transaction.code),
      textCell(`${transaction.patientName} - ${transaction.service.name}`),
      textCell(ledger.type === "Debit" ? "Kas" : ledger.type === "Kredit" ? "Piutang" : "Batal"),
      debitCell(ledger.debit),
      creditCell(ledger.credit),
      moneyCell(runningBalance),
      statusCell(transaction.status.replace("_", " ")),
    ];
  });
  const medicineRows = transactions.flatMap((transaction) =>
    transaction.medicines.map((item) => {
      const subtotal = Number(item.price) * item.quantity;

      return [
        textCell(transaction.code),
        textCell(transaction.patientName),
        textCell(item.medicine.name),
        textCell(item.medicine.dosage),
        numberCell(item.quantity),
        moneyCell(Number(item.price)),
        moneyCell(subtotal),
      ];
    })
  );
  const medicineTotal = transactions.reduce(
    (sum, transaction) =>
      sum +
      transaction.medicines.reduce(
        (itemSum, item) => itemSum + Number(item.price) * item.quantity,
        0
      ),
    0
  );

  const sheets: ExcelSheet[] = [
    {
      name: "Ringkasan",
      columns: [190, 135, 280],
      rows: [
        titleRow("Laporan Transaksi Akuntansi", 2),
        subtitleRow(`Dicetak ${formatDate(exportDate)}${filterSummary ? ` | ${filterSummary}` : ""}`, 2),
        blankRow(),
        sectionRow("Ringkasan Filter", 2),
        [headerCell("Metrik"), headerCell("Nilai"), headerCell("Catatan")],
        [textCell("Total Transaksi"), numberCell(transactions.length), textCell("Mengikuti filter halaman transaksi")],
        [textCell("Total Nominal"), moneyCell(totalRevenue), textCell("Debit + kredit, tidak termasuk batal")],
        [textCell("Total Debit (Lunas)"), debitCell(totalDebit), textCell("Pembayaran lunas / uang masuk")],
        [textCell("Total Kredit (Belum Lunas)"), creditCell(totalCredit), textCell("Tagihan belum lunas")],
        [textCell("Transaksi Batal"), numberCell(canceledCount), textCell("Tidak masuk debit/kredit")],
        [textCell("Pencarian"), textCell(filters.searchQuery || "-"), textCell("Filter teks")],
        [textCell("Status"), textCell(filters.statusFilter || "-"), textCell("Filter status")],
        [textCell("Tanggal Awal"), textCell(filters.dateFrom || "-"), textCell("Filter tanggal")],
        [textCell("Tanggal Akhir"), textCell(filters.dateTo || "-"), textCell("Filter tanggal")],
      ],
    },
    {
      name: "Jurnal Keuangan",
      columns: [95, 125, 280, 100, 120, 120, 120, 95],
      rows: [
        titleRow("Jurnal Keuangan Transaksi", 7),
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
          totalMoneyCell(totalDebit),
          totalMoneyCell(totalCredit),
          totalMoneyCell(runningBalance),
          textCell(""),
        ],
      ],
    },
    {
      name: "Transaksi",
      columns: [125, 95, 145, 150, 175, 200, 105, 85, 120, 120, 120, 220],
      rows: [
        titleRow("Detail Transaksi", 11),
        subtitleRow("Kolom debit/kredit mengikuti status pembayaran transaksi", 11),
        blankRow(),
        [
          headerCell("Kode"),
          headerCell("Tanggal"),
          headerCell("Pasien"),
          headerCell("Keluhan"),
          headerCell("Layanan"),
          headerCell("Dokter"),
          headerCell("Status"),
          headerCell("Jenis"),
          headerCell("Debit"),
          headerCell("Kredit"),
          headerCell("Jumlah"),
          headerCell("Catatan"),
        ],
        ...transactions.map((transaction) => {
          const amount = Number(transaction.amount);
          const ledger = ledgerEntry(transaction.status, amount);

          return [
            textCell(transaction.code),
            dateCell(transaction.date),
            textCell(transaction.patientName),
            textCell(transaction.complaint),
            textCell(transaction.service.name),
            textCell(transaction.doctor.name),
            statusCell(transaction.status.replace("_", " ")),
            typeCell(ledger.type),
            debitCell(ledger.debit),
            creditCell(ledger.credit),
            moneyCell(amount),
            textCell(transaction.notes),
          ];
        }),
        [
          textCell(""),
          textCell(""),
          textCell(""),
          textCell(""),
          textCell(""),
          textCell(""),
          textCell(""),
          totalLabelCell("TOTAL"),
          totalMoneyCell(totalDebit),
          totalMoneyCell(totalCredit),
          totalMoneyCell(totalDebit + totalCredit),
          textCell(""),
        ],
      ],
    },
    {
      name: "Obat Transaksi",
      columns: [125, 145, 220, 210, 85, 120, 120],
      rows: [
        titleRow("Rincian Obat Transaksi", 6),
        subtitleRow("Harga obat per transaksi dan subtotal", 6),
        blankRow(),
        [
          headerCell("Kode Transaksi"),
          headerCell("Pasien"),
          headerCell("Obat"),
          headerCell("Dosis"),
          headerCell("Jumlah"),
          headerCell("Harga Satuan"),
          headerCell("Subtotal"),
        ],
        ...medicineRows,
        [
          textCell(""),
          textCell(""),
          textCell(""),
          totalLabelCell("TOTAL"),
          totalNumberCell(
            transactions.reduce(
              (sum, transaction) =>
                sum +
                transaction.medicines.reduce(
                  (itemSum, item) => itemSum + item.quantity,
                  0
                ),
              0
            )
          ),
          textCell(""),
          totalMoneyCell(medicineTotal),
        ],
      ],
    },
  ];
  const file = accountingWorkbook(sheets);
  const filename = `transaksi-filter-${new Date().toISOString().slice(0, 10)}.xls`;

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
