import { Transaction, TransactionStatus } from "@prisma/client";
import { monthLabel } from "@/lib/format";

type Tx = Pick<Transaction, "date" | "amount" | "status"> & {
  service?: { name: string; category: string } | null;
  doctor?: { name: string } | null;
};

export function groupRevenueByMonth(transactions: Tx[], months = 6) {
  const now = new Date();
  const result = Array.from({ length: months }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      name: `${monthLabel(date.getMonth())}`,
      pendapatan: 0
    };
  });

  transactions.forEach((tx) => {
    if (tx.status !== TransactionStatus.LUNAS) return;
    const date = new Date(tx.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const found = result.find((item) => item.key === key);
    if (found) found.pendapatan += Number(tx.amount);
  });

  return result.map(({ key, ...item }) => item);
}

export function groupVisitsByDay(transactions: Tx[], days = 7) {
  const now = new Date();
  const result = Array.from({ length: days }).map((_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (days - 1 - index));
    return {
      key: date.toISOString().slice(0, 10),
      name: date.toLocaleDateString("id-ID", { weekday: "short" }),
      kunjungan: 0
    };
  });

  transactions.forEach((tx) => {
    if (tx.status === TransactionStatus.BATAL) return;
    const key = new Date(tx.date).toISOString().slice(0, 10);
    const found = result.find((item) => item.key === key);
    if (found) found.kunjungan += 1;
  });

  return result.map(({ key, ...item }) => item);
}

export function groupServiceDistribution(transactions: Tx[]) {
  const map = new Map<string, number>();

  transactions.forEach((tx) => {
    if (tx.status === TransactionStatus.BATAL) return;
    const name = tx.service?.name ?? "Tanpa Layanan";
    map.set(name, (map.get(name) ?? 0) + 1);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function groupRevenueByCategory(transactions: Tx[]) {
  const map = new Map<string, number>();

  transactions.forEach((tx) => {
    if (tx.status !== TransactionStatus.LUNAS) return;
    const name = tx.service?.category ?? "Lainnya";
    map.set(name, (map.get(name) ?? 0) + Number(tx.amount));
  });

  return Array.from(map.entries())
    .map(([name, pendapatan]) => ({ name, pendapatan }))
    .sort((a, b) => b.pendapatan - a.pendapatan);
}

export function groupRevenueByDoctor(transactions: Tx[]) {
  const map = new Map<string, number>();

  transactions.forEach((tx) => {
    if (tx.status !== TransactionStatus.LUNAS) return;
    const name = tx.doctor?.name ?? "Tanpa Dokter";
    map.set(name, (map.get(name) ?? 0) + Number(tx.amount));
  });

  return Array.from(map.entries())
    .map(([name, pendapatan]) => ({ name, pendapatan }))
    .sort((a, b) => b.pendapatan - a.pendapatan);
}
