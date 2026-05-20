import { TransactionStatus } from "@prisma/client";
import { formatDate } from "@/lib/format";
import {
  blankRow,
  creditCell,
  dateCell,
  debitCell,
  type ExcelRow,
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
} from "@/lib/excel-workbook";

type AccountType = "Aset" | "Ekuitas" | "Pendapatan" | "Beban";
type NormalBalance = "Debit" | "Kredit";

type Account = {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  statement: string;
};

type ReportMedicine = {
  quantity: number;
  price: unknown;
};

export type AccountingTransaction = {
  code: string;
  date: Date;
  patientName: string;
  status: TransactionStatus;
  amount: unknown;
  service: {
    name: string;
    price: unknown;
  };
  medicines?: ReportMedicine[];
};

type JournalLine = {
  date: Date;
  code: string;
  patientName: string;
  description: string;
  account: Account;
  debit: number;
  credit: number;
  status: TransactionStatus | string;
};

export type AdditionalAccountingLine = {
  date: Date;
  code: string;
  description: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  statement: string;
  debit: number;
  credit: number;
  status?: string;
};

const ACCOUNTS = {
  cash: {
    code: "101",
    name: "Kas",
    type: "Aset",
    normalBalance: "Debit",
    statement: "Neraca",
  },
  receivable: {
    code: "102",
    name: "Piutang Usaha",
    type: "Aset",
    normalBalance: "Debit",
    statement: "Neraca",
  },
  equipment: {
    code: "103",
    name: "Peralatan Klinik",
    type: "Aset",
    normalBalance: "Debit",
    statement: "Neraca",
  },
  capital: {
    code: "301",
    name: "Modal Pemilik",
    type: "Ekuitas",
    normalBalance: "Kredit",
    statement: "Perubahan Modal / Neraca",
  },
  ownerDraw: {
    code: "302",
    name: "Prive",
    type: "Ekuitas",
    normalBalance: "Debit",
    statement: "Perubahan Modal",
  },
  retainedEarnings: {
    code: "399",
    name: "Laba Berjalan",
    type: "Ekuitas",
    normalBalance: "Kredit",
    statement: "Neraca",
  },
  serviceRevenue: {
    code: "401",
    name: "Pendapatan Layanan",
    type: "Pendapatan",
    normalBalance: "Kredit",
    statement: "Laba Rugi",
  },
  medicineRevenue: {
    code: "402",
    name: "Pendapatan Obat",
    type: "Pendapatan",
    normalBalance: "Kredit",
    statement: "Laba Rugi",
  },
  otherRevenue: {
    code: "403",
    name: "Pendapatan Lain-lain",
    type: "Pendapatan",
    normalBalance: "Kredit",
    statement: "Laba Rugi",
  },
  operatingExpense: {
    code: "501",
    name: "Beban Operasional",
    type: "Beban",
    normalBalance: "Debit",
    statement: "Laba Rugi",
  },
} satisfies Record<string, Account>;

const ACCOUNT_LIST = Object.values(ACCOUNTS);

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundCurrency(value: number) {
  return Math.round(value);
}

function medicineTotal(transaction: AccountingTransaction) {
  return roundCurrency(
    (transaction.medicines ?? []).reduce(
      (sum, item) => sum + toNumber(item.price) * item.quantity,
      0
    )
  );
}

function serviceRevenue(transaction: AccountingTransaction) {
  return roundCurrency(toNumber(transaction.service.price));
}

function statusText(status: TransactionStatus | string) {
  return String(status).replace("_", " ");
}

function accountBalance(account: Account, debit: number, credit: number) {
  return account.normalBalance === "Debit" ? debit - credit : credit - debit;
}

function transactionJournalLines(transaction: AccountingTransaction): JournalLine[] {
  if (transaction.status === TransactionStatus.BATAL) return [];

  const amount = roundCurrency(toNumber(transaction.amount));
  if (amount <= 0) return [];

  const serviceAmount = serviceRevenue(transaction);
  const medicineAmount = medicineTotal(transaction);
  const otherAmount = Math.max(0, amount - serviceAmount - medicineAmount);
  const debitAccount =
    transaction.status === TransactionStatus.LUNAS
      ? ACCOUNTS.cash
      : ACCOUNTS.receivable;
  const description = `${transaction.patientName} - ${transaction.service.name}`;
  const lines: JournalLine[] = [
    {
      date: transaction.date,
      code: transaction.code,
      patientName: transaction.patientName,
      description,
      account: debitAccount,
      debit: amount,
      credit: 0,
      status: transaction.status,
    },
  ];

  if (serviceAmount > 0) {
    lines.push({
      date: transaction.date,
      code: transaction.code,
      patientName: transaction.patientName,
      description,
      account: ACCOUNTS.serviceRevenue,
      debit: 0,
      credit: serviceAmount,
      status: transaction.status,
    });
  }

  if (medicineAmount > 0) {
    lines.push({
      date: transaction.date,
      code: transaction.code,
      patientName: transaction.patientName,
      description,
      account: ACCOUNTS.medicineRevenue,
      debit: 0,
      credit: medicineAmount,
      status: transaction.status,
    });
  }

  if (otherAmount > 0) {
    lines.push({
      date: transaction.date,
      code: transaction.code,
      patientName: transaction.patientName,
      description,
      account: ACCOUNTS.otherRevenue,
      debit: 0,
      credit: otherAmount,
      status: transaction.status,
    });
  }

  return lines;
}

function additionalJournalLines(lines: AdditionalAccountingLine[]): JournalLine[] {
  return lines.map((line) => ({
    date: line.date,
    code: line.code,
    patientName: "-",
    description: line.description,
    account: {
      code: line.accountCode,
      name: line.accountName,
      type: line.accountType,
      normalBalance: line.normalBalance,
      statement: line.statement,
    },
    debit: line.debit,
    credit: line.credit,
    status: line.status ?? "Aktivitas",
  }));
}

function buildJournal(
  transactions: AccountingTransaction[],
  additionalLines: AdditionalAccountingLine[] = []
) {
  return transactions
    .flatMap(transactionJournalLines)
    .concat(additionalJournalLines(additionalLines))
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.code.localeCompare(b.code));
}

function totalsForAccount(lines: JournalLine[], account: Account) {
  const accountLines = lines.filter((line) => line.account.code === account.code);
  const debit = accountLines.reduce((sum, line) => sum + line.debit, 0);
  const credit = accountLines.reduce((sum, line) => sum + line.credit, 0);
  const balance = accountBalance(account, debit, credit);

  return {
    debit,
    credit,
    balance,
  };
}

function accountNameCell(account: Account) {
  return textCell(`${account.code} - ${account.name}`);
}

function buildChartOfAccountsSheet(): ExcelSheet {
  return {
    name: "Daftar Akun",
    columns: [85, 210, 120, 110, 190],
    rows: [
      titleRow("Daftar Akun (Chart of Accounts)", 4),
      subtitleRow("Kode dan nama akun yang dipakai dalam laporan", 4),
      blankRow(),
      [
        headerCell("Kode"),
        headerCell("Nama Akun"),
        headerCell("Kelompok"),
        headerCell("Saldo Normal"),
        headerCell("Laporan"),
      ],
      ...ACCOUNT_LIST.map((account) => [
        textCell(account.code),
        textCell(account.name),
        textCell(account.type),
        textCell(account.normalBalance),
        textCell(account.statement),
      ]),
    ],
  };
}

function buildGeneralJournalSheet(lines: JournalLine[], title: string, subtitle: string): ExcelSheet {
  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

  return {
    name: "Jurnal Umum",
    columns: [95, 120, 85, 190, 280, 120, 120, 95],
    rows: [
      titleRow(title, 7),
      subtitleRow(subtitle, 7),
      blankRow(),
      [
        headerCell("Tanggal"),
        headerCell("No Bukti"),
        headerCell("Kode Akun"),
        headerCell("Nama Akun"),
        headerCell("Keterangan"),
        headerCell("Debet"),
        headerCell("Kredit"),
        headerCell("Status"),
      ],
      ...lines.map((line) => [
        dateCell(line.date),
        textCell(line.code),
        textCell(line.account.code),
        textCell(line.account.name),
        textCell(line.description),
        debitCell(line.debit),
        creditCell(line.credit),
        statusCell(statusText(line.status)),
      ]),
      [
        textCell(""),
        textCell(""),
        textCell(""),
        textCell(""),
        totalLabelCell("TOTAL"),
        totalMoneyCell(totalDebit),
        totalMoneyCell(totalCredit),
        textCell(totalDebit === totalCredit ? "Balance" : "Selisih"),
      ],
    ],
  };
}

function buildLedgerSheet(lines: JournalLine[], title: string, subtitle: string): ExcelSheet {
  const rows: ExcelRow[] = [
    titleRow(title, 7),
    subtitleRow(subtitle, 7),
    blankRow(),
  ];

  for (const account of ACCOUNT_LIST) {
    const accountLines = lines.filter((line) => line.account.code === account.code);
    if (accountLines.length === 0) continue;

    let runningBalance = 0;
    rows.push(sectionRow(`${account.code} - ${account.name}`, 7));
    rows.push([
      headerCell("Tanggal"),
      headerCell("No Bukti"),
      headerCell("Keterangan"),
      headerCell("Debet"),
      headerCell("Kredit"),
      headerCell("Saldo"),
      headerCell("Saldo Normal"),
      headerCell("Status"),
    ]);

    for (const line of accountLines) {
      runningBalance += accountBalance(account, line.debit, line.credit);
      rows.push([
        dateCell(line.date),
        textCell(line.code),
        textCell(line.description),
        debitCell(line.debit),
        creditCell(line.credit),
        moneyCell(runningBalance),
        textCell(account.normalBalance),
        statusCell(statusText(line.status)),
      ]);
    }

    const totals = totalsForAccount(lines, account);
    rows.push([
      textCell(""),
      textCell(""),
      totalLabelCell("TOTAL"),
      totalMoneyCell(totals.debit),
      totalMoneyCell(totals.credit),
      totalMoneyCell(totals.balance),
      textCell(""),
      textCell(""),
    ]);
    rows.push(blankRow());
  }

  return {
    name: "Buku Besar",
    columns: [95, 120, 290, 120, 120, 120, 100, 95],
    rows,
  };
}

function buildTrialBalanceSheet(lines: JournalLine[], title: string, subtitle: string): ExcelSheet {
  const accountRows = ACCOUNT_LIST.map((account) => {
    const totals = totalsForAccount(lines, account);
    const debitBalance = account.normalBalance === "Debit" && totals.balance > 0 ? totals.balance : 0;
    const creditBalance =
      account.normalBalance === "Kredit" && totals.balance > 0 ? totals.balance : 0;

    return {
      account,
      debitBalance,
      creditBalance,
    };
  });
  const totalDebit = accountRows.reduce((sum, row) => sum + row.debitBalance, 0);
  const totalCredit = accountRows.reduce((sum, row) => sum + row.creditBalance, 0);

  return {
    name: "Neraca Saldo",
    columns: [85, 210, 120, 120],
    rows: [
      titleRow(title, 3),
      subtitleRow(subtitle, 3),
      blankRow(),
      [
        headerCell("Kode"),
        headerCell("Nama Akun"),
        headerCell("Debet"),
        headerCell("Kredit"),
      ],
      ...accountRows.map(({ account, debitBalance, creditBalance }) => [
        textCell(account.code),
        textCell(account.name),
        debitCell(debitBalance),
        creditCell(creditBalance),
      ]),
      [
        textCell(""),
        totalLabelCell("TOTAL"),
        totalMoneyCell(totalDebit),
        totalMoneyCell(totalCredit),
      ],
    ],
  };
}

function buildFinancialStatementsSheet(lines: JournalLine[], title: string, subtitle: string): ExcelSheet {
  const cash = totalsForAccount(lines, ACCOUNTS.cash).balance;
  const receivable = totalsForAccount(lines, ACCOUNTS.receivable).balance;
  const equipment = totalsForAccount(lines, ACCOUNTS.equipment).balance;
  const beginningCapital = totalsForAccount(lines, ACCOUNTS.capital).balance;
  const ownerDraw = totalsForAccount(lines, ACCOUNTS.ownerDraw).balance;
  const serviceRevenue = totalsForAccount(lines, ACCOUNTS.serviceRevenue).balance;
  const medicineRevenue = totalsForAccount(lines, ACCOUNTS.medicineRevenue).balance;
  const otherRevenue = totalsForAccount(lines, ACCOUNTS.otherRevenue).balance;
  const operatingExpense = totalsForAccount(lines, ACCOUNTS.operatingExpense).balance;
  const totalRevenue = serviceRevenue + medicineRevenue + otherRevenue;
  const netIncome = totalRevenue - operatingExpense;
  const endingCapital = beginningCapital + netIncome - ownerDraw;
  const totalAssets = cash + receivable + equipment;

  return {
    name: "Laporan Keuangan",
    columns: [260, 140, 260, 140],
    rows: [
      titleRow(title, 3),
      subtitleRow(subtitle, 3),
      blankRow(),
      sectionRow("Laporan Laba Rugi", 1),
      [headerCell("Keterangan"), headerCell("Jumlah")],
      [textCell("Pendapatan Layanan"), moneyCell(serviceRevenue)],
      [textCell("Pendapatan Obat"), moneyCell(medicineRevenue)],
      [textCell("Pendapatan Lain-lain"), moneyCell(otherRevenue)],
      [totalLabelCell("Total Pendapatan"), totalMoneyCell(totalRevenue)],
      [textCell("Beban Operasional"), moneyCell(operatingExpense)],
      [totalLabelCell("Laba Bersih"), totalMoneyCell(netIncome)],
      blankRow(),
      sectionRow("Laporan Perubahan Modal", 1),
      [headerCell("Keterangan"), headerCell("Jumlah")],
      [textCell("Modal Awal"), moneyCell(beginningCapital)],
      [textCell("Tambah: Laba Bersih"), moneyCell(netIncome)],
      [textCell("Kurang: Prive"), moneyCell(ownerDraw)],
      [totalLabelCell("Modal Akhir"), totalMoneyCell(endingCapital)],
      blankRow(),
      sectionRow("Neraca", 3),
      [headerCell("Aset"), headerCell("Jumlah"), headerCell("Ekuitas"), headerCell("Jumlah")],
      [textCell("Kas"), moneyCell(cash), textCell("Modal Akhir"), moneyCell(endingCapital)],
      [textCell("Piutang Usaha"), moneyCell(receivable), textCell(""), moneyCell(0)],
      [textCell("Peralatan Klinik"), moneyCell(equipment), textCell(""), moneyCell(0)],
      [totalLabelCell("Total Aset"), totalMoneyCell(totalAssets), totalLabelCell("Total Ekuitas"), totalMoneyCell(endingCapital)],
    ],
  };
}

export function buildAccountingSheets({
  transactions,
  reportTitle,
  subtitle,
  additionalLines = [],
}: {
  transactions: AccountingTransaction[];
  reportTitle: string;
  subtitle: string;
  additionalLines?: AdditionalAccountingLine[];
}) {
  const lines = buildJournal(transactions, additionalLines);

  return {
    lines,
    sheets: [
      buildChartOfAccountsSheet(),
      buildGeneralJournalSheet(lines, "Jurnal Umum", subtitle),
      buildLedgerSheet(lines, "Buku Besar", subtitle),
      buildTrialBalanceSheet(lines, "Neraca Saldo", subtitle),
      buildFinancialStatementsSheet(lines, reportTitle, subtitle),
    ],
  };
}
