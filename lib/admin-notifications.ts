import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStartOfDay } from "@/lib/format";

export type AdminNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "amber" | "red" | "blue";
};

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const [unpaidCount, lowStockMedicines, todayVisitCount] = await Promise.all([
    prisma.transaction.count({
      where: {
        status: TransactionStatus.BELUM_LUNAS,
      },
    }),
    prisma.medicine.findMany({
      where: {
        active: true,
        stock: {
          lte: 10,
        },
      },
      orderBy: {
        stock: "asc",
      },
      take: 5,
    }),
    prisma.transaction.count({
      where: {
        date: {
          gte: getStartOfDay(),
        },
        status: {
          not: TransactionStatus.BATAL,
        },
      },
    }),
  ]);

  const notifications: AdminNotification[] = [];

  if (unpaidCount > 0) {
    notifications.push({
      id: "unpaid-transactions",
      title: "Transaksi belum lunas",
      description: `${unpaidCount} transaksi masih perlu ditindaklanjuti.`,
      href: "/transaksi?status=BELUM_LUNAS",
      tone: "amber",
    });
  }

  if (lowStockMedicines.length > 0) {
    const names = lowStockMedicines
      .map((medicine) => `${medicine.name} (${medicine.stock})`)
      .join(", ");

    notifications.push({
      id: "low-stock",
      title: "Stok obat rendah",
      description: names,
      href: "/obat",
      tone: "red",
    });
  }

  if (todayVisitCount === 0) {
    notifications.push({
      id: "today-visits",
      title: "Belum ada kunjungan hari ini",
      description: "Data kunjungan hari ini masih kosong.",
      href: "/kunjungan",
      tone: "blue",
    });
  }

  return notifications;
}
