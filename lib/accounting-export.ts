import { AccountType, NormalBalance } from "@prisma/client";
import type { AdditionalAccountingLine } from "@/lib/accounting-report";

type JournalEntryForExport = {
  date: Date;
  code: string;
  description: string;
  sourceType: string;
  lines: {
    debit: unknown;
    credit: unknown;
    account: {
      code: string;
      name: string;
      type: AccountType;
      normalBalance: NormalBalance;
      statement: string;
    };
  }[];
};

function reportAccountType(type: AccountType): AdditionalAccountingLine["accountType"] {
  if (type === AccountType.EKUITAS) return "Ekuitas";
  if (type === AccountType.PENDAPATAN) return "Pendapatan";
  if (type === AccountType.BEBAN) return "Beban";

  return "Aset";
}

function reportNormalBalance(
  normalBalance: NormalBalance
): AdditionalAccountingLine["normalBalance"] {
  return normalBalance === NormalBalance.KREDIT ? "Kredit" : "Debit";
}

export function journalEntriesToAccountingLines(
  entries: JournalEntryForExport[]
): AdditionalAccountingLine[] {
  return entries.flatMap((entry) =>
    entry.lines.map((line) => ({
      date: entry.date,
      code: entry.code,
      description: entry.description,
      accountCode: line.account.code,
      accountName: line.account.name,
      accountType: reportAccountType(line.account.type),
      normalBalance: reportNormalBalance(line.account.normalBalance),
      statement: line.account.statement,
      debit: Number(line.debit),
      credit: Number(line.credit),
      status: entry.sourceType === "FINANCIAL_ACTIVITY" ? "Aktivitas" : "Jurnal",
    }))
  );
}
