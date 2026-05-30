import { Account, JournalEntry, JournalLine, AccountType, NormalBalance } from "@prisma/client";

export type JournalLineWithAccount = JournalLine & {
  account: Account;
};

export type JournalEntryWithLines = JournalEntry & {
  lines: JournalLineWithAccount[];
};

export interface LedgerLine {
  date: Date;
  code: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface LedgerAccount {
  account: Account;
  lines: LedgerLine[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface TrialBalanceItem {
  code: string;
  name: string;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  items: TrialBalanceItem[];
  totalDebit: number;
  totalCredit: number;
}

export interface FinancialStatements {
  labaRugi: {
    revenueItems: { name: string; amount: number }[];
    totalRevenue: number;
    expenseItems: { name: string; amount: number }[];
    totalExpense: number;
    netIncome: number;
  };
  perubahanModal: {
    beginningCapital: number;
    netIncome: number;
    prive: number;
    endingCapital: number;
  };
  neraca: {
    assets: { name: string; amount: number }[];
    totalAssets: number;
    liabilities: { name: string; amount: number }[];
    totalLiabilities: number;
    equity: { name: string; amount: number }[];
    totalEquity: number;
  };
}

/**
 * Menghitung Buku Besar (Ledger) untuk seluruh akun berdasarkan data Jurnal
 */
export function calculateLedger(
  journalEntries: JournalEntryWithLines[],
  accounts: Account[]
): Map<string, LedgerAccount> {
  const ledgerMap = new Map<string, LedgerAccount>();

  // Inisialisasi setiap akun
  for (const account of accounts) {
    ledgerMap.set(account.code, {
      account,
      lines: [],
      totalDebit: 0,
      totalCredit: 0,
      balance: 0,
    });
  }

  // Urutkan jurnal kronologis (tertua ke terbaru)
  const sortedEntries = [...journalEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.code.localeCompare(b.code)
  );

  // Masukkan setiap baris jurnal ke Buku Besar akun masing-masing
  for (const entry of sortedEntries) {
    for (const line of entry.lines) {
      const ledgerAcc = ledgerMap.get(line.account.code);
      if (!ledgerAcc) continue;

      const debit = Number(line.debit);
      const credit = Number(line.credit);

      ledgerAcc.totalDebit += debit;
      ledgerAcc.totalCredit += credit;

      // Hitung perubahan saldo berdasarkan Saldo Normal Akun
      let amountChange = 0;
      if (ledgerAcc.account.normalBalance === NormalBalance.DEBIT) {
        amountChange = debit - credit;
      } else {
        amountChange = credit - debit;
      }

      const prevBalance = ledgerAcc.lines.length > 0 
        ? ledgerAcc.lines[ledgerAcc.lines.length - 1].runningBalance 
        : 0;

      ledgerAcc.lines.push({
        date: entry.date,
        code: entry.code,
        description: entry.description,
        debit,
        credit,
        runningBalance: prevBalance + amountChange,
      });
    }
  }

  // Set saldo akhir bersih untuk setiap akun
  ledgerMap.forEach((ledgerAcc) => {
    ledgerAcc.balance = ledgerAcc.lines.length > 0 
      ? ledgerAcc.lines[ledgerAcc.lines.length - 1].runningBalance 
      : 0;
  });

  return ledgerMap;
}

/**
 * Menghitung Neraca Saldo (Trial Balance) berdasarkan Buku Besar
 */
export function calculateTrialBalance(
  ledgers: Map<string, LedgerAccount>,
  accounts: Account[]
): TrialBalance {
  const items: TrialBalanceItem[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  // Urutkan akun berdasarkan kode
  const sortedAccounts = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

  for (const account of sortedAccounts) {
    const ledger = ledgers.get(account.code);
    const balance = ledger ? ledger.balance : 0;

    let debit = 0;
    let credit = 0;

    if (account.normalBalance === NormalBalance.DEBIT) {
      debit = balance > 0 ? balance : 0;
    } else {
      credit = balance > 0 ? balance : 0;
    }

    items.push({
      code: account.code,
      name: account.name,
      debit,
      credit,
    });

    totalDebit += debit;
    totalCredit += credit;
  }

  return {
    items,
    totalDebit,
    totalCredit,
  };
}

/**
 * Menghitung Laporan Keuangan (Laba Rugi, Perubahan Modal, Neraca)
 */
export function calculateFinancialStatements(
  ledgers: Map<string, LedgerAccount>,
  accounts: Account[]
): FinancialStatements {
  // 1. LAPORAN LABA RUGI
  const revenueItems: { name: string; amount: number }[] = [];
  const expenseItems: { name: string; amount: number }[] = [];

  for (const account of accounts) {
    const ledger = ledgers.get(account.code);
    const balance = ledger ? ledger.balance : 0;

    if (account.type === AccountType.PENDAPATAN) {
      revenueItems.push({ name: account.name, amount: balance });
    } else if (account.type === AccountType.BEBAN) {
      expenseItems.push({ name: account.name, amount: balance });
    }
  }

  const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalRevenue - totalExpense;

  // 2. LAPORAN PERUBAHAN MODAL
  const modalAccount = ledgers.get("301"); // Modal Pemilik
  const priveAccount = ledgers.get("302"); // Prive

  const beginningCapital = modalAccount ? modalAccount.balance : 0;
  const prive = priveAccount ? priveAccount.balance : 0;
  const endingCapital = beginningCapital + netIncome - prive;

  // 3. NERACA
  const assets: { name: string; amount: number }[] = [];
  const liabilities: { name: string; amount: number }[] = [];

  for (const account of accounts) {
    const ledger = ledgers.get(account.code);
    const balance = ledger ? ledger.balance : 0;

    if (account.type === AccountType.ASET) {
      assets.push({ name: account.name, amount: balance });
    } else if (account.type === AccountType.KEWAJIBAN) {
      liabilities.push({ name: account.name, amount: balance });
    }
  }

  const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);

  // Ekuitas Neraca hanya menampilkan Modal Akhir
  const equity = [{ name: "Modal Akhir Pemilik", amount: endingCapital }];
  const totalEquity = endingCapital;

  return {
    labaRugi: {
      revenueItems,
      totalRevenue,
      expenseItems,
      totalExpense,
      netIncome,
    },
    perubahanModal: {
      beginningCapital,
      netIncome,
      prive,
      endingCapital,
    },
    neraca: {
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
    },
  };
}
