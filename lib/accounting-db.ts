import {
  AccountType,
  FinancialActivityType,
  JournalSourceType,
  NormalBalance,
  Prisma,
  TransactionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export const DEFAULT_ACCOUNT_DATA = [
  {
    code: "101",
    name: "Kas",
    type: AccountType.ASET,
    normalBalance: NormalBalance.DEBIT,
    statement: "Neraca",
  },
  {
    code: "102",
    name: "Piutang Usaha",
    type: AccountType.ASET,
    normalBalance: NormalBalance.DEBIT,
    statement: "Neraca",
  },
  {
    code: "103",
    name: "Peralatan Klinik",
    type: AccountType.ASET,
    normalBalance: NormalBalance.DEBIT,
    statement: "Neraca",
  },
  {
    code: "301",
    name: "Modal Pemilik",
    type: AccountType.EKUITAS,
    normalBalance: NormalBalance.KREDIT,
    statement: "Perubahan Modal / Neraca",
  },
  {
    code: "302",
    name: "Prive",
    type: AccountType.EKUITAS,
    normalBalance: NormalBalance.DEBIT,
    statement: "Perubahan Modal",
  },
  {
    code: "399",
    name: "Laba Berjalan",
    type: AccountType.EKUITAS,
    normalBalance: NormalBalance.KREDIT,
    statement: "Neraca",
  },
  {
    code: "401",
    name: "Pendapatan Layanan",
    type: AccountType.PENDAPATAN,
    normalBalance: NormalBalance.KREDIT,
    statement: "Laba Rugi",
  },
  {
    code: "402",
    name: "Pendapatan Obat",
    type: AccountType.PENDAPATAN,
    normalBalance: NormalBalance.KREDIT,
    statement: "Laba Rugi",
  },
  {
    code: "403",
    name: "Pendapatan Lain-lain",
    type: AccountType.PENDAPATAN,
    normalBalance: NormalBalance.KREDIT,
    statement: "Laba Rugi",
  },
  {
    code: "501",
    name: "Beban Operasional",
    type: AccountType.BEBAN,
    normalBalance: NormalBalance.DEBIT,
    statement: "Laba Rugi",
  },
];

type JournalLineInput = {
  accountCode: string;
  debit?: number;
  credit?: number;
};

export async function ensureDefaultAccounts(client: DbClient = prisma) {
  await Promise.all(
    DEFAULT_ACCOUNT_DATA.map((account) =>
      client.account.upsert({
        where: { code: account.code },
        update: {
          name: account.name,
          type: account.type,
          normalBalance: account.normalBalance,
          statement: account.statement,
          active: true,
        },
        create: account,
      })
    )
  );
}

async function createJournalEntry(
  client: DbClient,
  input: {
    code: string;
    date: Date;
    description: string;
    sourceType: JournalSourceType;
    sourceId: string;
    lines: JournalLineInput[];
  }
) {
  const accountCodes = Array.from(new Set(input.lines.map((line) => line.accountCode)));
  const accounts = await client.account.findMany({
    where: { code: { in: accountCodes }, active: true },
  });
  const accountByCode = new Map(accounts.map((account) => [account.code, account.id]));

  const lineData = input.lines.map((line) => {
    const accountId = accountByCode.get(line.accountCode);
    if (!accountId) {
      throw new Error(`Akun ${line.accountCode} belum tersedia`);
    }

    return {
      accountId,
      debit: line.debit ?? 0,
      credit: line.credit ?? 0,
    };
  });

  const totalDebit = lineData.reduce((sum, line) => sum + Number(line.debit), 0);
  const totalCredit = lineData.reduce((sum, line) => sum + Number(line.credit), 0);

  if (Math.round(totalDebit) !== Math.round(totalCredit)) {
    throw new Error("Jurnal tidak seimbang");
  }

  return client.journalEntry.create({
    data: {
      code: input.code,
      date: input.date,
      description: input.description,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      lines: {
        create: lineData,
      },
    },
  });
}

export async function deleteJournalForSource(
  client: DbClient,
  sourceType: JournalSourceType,
  sourceId: string
) {
  await client.journalEntry.deleteMany({
    where: {
      sourceType,
      sourceId,
    },
  });
}

export function activityTypeLabel(type: FinancialActivityType | string) {
  const labels: Record<string, string> = {
    MODAL_AWAL: "Setoran Modal Awal",
    PEMBELIAN_ASET: "Pembelian Aset/Peralatan",
    BEBAN_OPERASIONAL: "Pembayaran Beban Operasional",
    PRIVE: "Pengambilan Pribadi (Prive)",
  };

  return labels[type] ?? String(type).replaceAll("_", " ");
}

export function activityTypeOptions() {
  return [
    FinancialActivityType.MODAL_AWAL,
    FinancialActivityType.PEMBELIAN_ASET,
    FinancialActivityType.BEBAN_OPERASIONAL,
    FinancialActivityType.PRIVE,
  ].map((type) => ({
    value: type,
    label: activityTypeLabel(type),
  }));
}

export function accountTypeLabel(type: AccountType | string) {
  const labels: Record<string, string> = {
    ASET: "Aset",
    KEWAJIBAN: "Kewajiban",
    EKUITAS: "Ekuitas",
    PENDAPATAN: "Pendapatan",
    BEBAN: "Beban",
  };

  return labels[type] ?? String(type);
}

export function normalBalanceLabel(balance: NormalBalance | string) {
  return balance === NormalBalance.DEBIT || balance === "DEBIT" ? "Debit" : "Kredit";
}

function activityJournalLines(type: FinancialActivityType, amount: number): JournalLineInput[] {
  if (type === FinancialActivityType.MODAL_AWAL) {
    return [
      { accountCode: "101", debit: amount },
      { accountCode: "301", credit: amount },
    ];
  }

  if (type === FinancialActivityType.PEMBELIAN_ASET) {
    return [
      { accountCode: "103", debit: amount },
      { accountCode: "101", credit: amount },
    ];
  }

  if (type === FinancialActivityType.PRIVE) {
    return [
      { accountCode: "302", debit: amount },
      { accountCode: "101", credit: amount },
    ];
  }

  return [
    { accountCode: "501", debit: amount },
    { accountCode: "101", credit: amount },
  ];
}

export async function syncFinancialActivityJournal(
  client: DbClient,
  activity: {
    id: string;
    code: string;
    type: FinancialActivityType;
    date: Date;
    description: string;
    amount: Prisma.Decimal | number;
  }
) {
  await ensureDefaultAccounts(client);
  await deleteJournalForSource(client, JournalSourceType.FINANCIAL_ACTIVITY, activity.id);

  const amount = Number(activity.amount);
  if (amount <= 0) return;

  await createJournalEntry(client, {
    code: `JRN-${activity.code}`,
    date: activity.date,
    description: `${activityTypeLabel(activity.type)} - ${activity.description}`,
    sourceType: JournalSourceType.FINANCIAL_ACTIVITY,
    sourceId: activity.id,
    lines: activityJournalLines(activity.type, amount),
  });
}

export async function syncTransactionJournal(
  client: DbClient,
  transaction: {
    id: string;
    code: string;
    patientName: string;
    status: TransactionStatus;
    date: Date;
    amount: Prisma.Decimal | number;
    service: {
      name: string;
      price: Prisma.Decimal | number;
    };
    medicines: {
      quantity: number;
      price: Prisma.Decimal | number;
    }[];
  }
) {
  await ensureDefaultAccounts(client);
  await deleteJournalForSource(client, JournalSourceType.TRANSACTION, transaction.id);

  if (transaction.status === TransactionStatus.BATAL) return;

  const amount = Math.round(Number(transaction.amount));
  if (amount <= 0) return;

  const serviceAmount = Math.round(Number(transaction.service.price));
  const medicineAmount = Math.round(
    transaction.medicines.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  );
  const otherAmount = Math.max(0, amount - serviceAmount - medicineAmount);
  const lines: JournalLineInput[] = [
    {
      accountCode: transaction.status === TransactionStatus.LUNAS ? "101" : "102",
      debit: amount,
    },
  ];

  if (serviceAmount > 0) lines.push({ accountCode: "401", credit: serviceAmount });
  if (medicineAmount > 0) lines.push({ accountCode: "402", credit: medicineAmount });
  if (otherAmount > 0) lines.push({ accountCode: "403", credit: otherAmount });

  await createJournalEntry(client, {
    code: `JRN-${transaction.code}`,
    date: transaction.date,
    description: `${transaction.patientName} - ${transaction.service.name}`,
    sourceType: JournalSourceType.TRANSACTION,
    sourceId: transaction.id,
    lines,
  });
}
