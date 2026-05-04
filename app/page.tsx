import {
  DollarSign,
  Stethoscope,
  Users,
  ClipboardList,
  TestTube2,
} from "lucide-react";
import Link from "next/link";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate, formatRupiah, getStartOfMonth } from "@/lib/format";
import {
  groupRevenueByMonth,
  groupServiceDistribution,
  groupVisitsByDay,
} from "@/lib/analytics";
import RevenueChart from "@/components/charts/RevenueChart";
import ServiceChart from "@/components/charts/ServiceChart";
import VisitChart from "@/components/charts/VisitChart";
import StatCard from "@/components/StatCard";

function trendLabel(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "Baru" : "0%";

  const percentage = ((current - previous) / previous) * 100;
  if (percentage === 0) return "0%";

  return `${percentage > 0 ? "+" : ""}${percentage.toFixed(1)}%`;
}

export default async function DashboardPage() {
  const startOfMonth = getStartOfMonth();
  const startOfPreviousMonth = getStartOfMonth(
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  );

  const [
    doctorCount,
    patientCount,
    serviceCount,
    transactionCount,
    previousTransactionCount,
    revenueMonth,
    revenuePreviousMonth,
    transactions,
    recentTransactions,
  ] = await Promise.all([
    prisma.doctor.count({
      where: {
        active: true,
      },
    }),

    prisma.patient.count(),

    prisma.service.count({
      where: {
        active: true,
      },
    }),

    prisma.transaction.count({
      where: {
        date: {
          gte: startOfMonth,
        },
        status: {
          not: TransactionStatus.BATAL,
        },
      },
    }),

    prisma.transaction.count({
      where: {
        date: {
          gte: startOfPreviousMonth,
          lt: startOfMonth,
        },
        status: {
          not: TransactionStatus.BATAL,
        },
      },
    }),

    prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        date: {
          gte: startOfMonth,
        },
        status: TransactionStatus.LUNAS,
      },
    }),

    prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        date: {
          gte: startOfPreviousMonth,
          lt: startOfMonth,
        },
        status: TransactionStatus.LUNAS,
      },
    }),

    prisma.transaction.findMany({
      where: {
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1),
        },
      },
      include: {
        service: true,
        doctor: true,
      },
    }),

    prisma.transaction.findMany({
      take: 7,
      orderBy: {
        date: "desc",
      },
      include: {
        service: true,
        doctor: true,
      },
    }),
  ]);

  const revenueData = groupRevenueByMonth(transactions, 6);
  const serviceData = groupServiceDistribution(transactions).slice(0, 6);
  const visitData = groupVisitsByDay(transactions, 7);
  const topServices = serviceData.slice(0, 5);
  const currentRevenueValue = Number(revenueMonth._sum.amount ?? 0);
  const previousRevenueValue = Number(revenuePreviousMonth._sum.amount ?? 0);

  return (
    <div className="fade-in space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-soft sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-8 xl:flex-row xl:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <ClipboardList size={16} />
              Dashboard Klinik & Rumah Sakit
            </div>

            <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl xl:text-5xl">
              MediCare Pro Management System
            </h1>
          </div>

          <div className="rounded-3xl bg-white/15 p-5 backdrop-blur xl:min-w-80">
            <p className="text-sm font-medium text-blue-100">
              Pendapatan Bulan Ini
            </p>

            <h2 className="mt-2 text-3xl font-extrabold">
              {formatRupiah(revenueMonth._sum.amount?.toString())}
            </h2>

            <p className="mt-2 text-sm text-blue-100">
              Status transaksi lunas
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Pendapatan Bulan Ini"
          value={formatRupiah(revenueMonth._sum.amount?.toString())}
          icon={DollarSign}
          color="green"
          trend={trendLabel(currentRevenueValue, previousRevenueValue)}
        />

        <StatCard
          title="Total Kunjungan Bulan Ini"
          value={transactionCount}
          icon={Users}
          color="blue"
          trend={trendLabel(transactionCount, previousTransactionCount)}
        />

        <StatCard
          title="Total Layanan Aktif"
          value={serviceCount}
          icon={TestTube2}
          color="purple"
          caption="Layanan siap digunakan"
        />

        <StatCard
          title="Dokter Aktif"
          value={doctorCount}
          icon={Stethoscope}
          color="orange"
          caption={`${patientCount} pasien terdaftar`}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Grafik Pendapatan 6 Bulan Terakhir
              </h3>

              <p className="text-sm text-slate-500">
                Data dihitung dari transaksi berstatus lunas.
              </p>
            </div>
          </div>

          <RevenueChart data={revenueData} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">
            Distribusi Layanan
          </h3>

          <p className="text-sm text-slate-500">
            Jumlah kunjungan berdasarkan layanan.
          </p>

          <ServiceChart
            data={
              serviceData.length
                ? serviceData
                : [{ name: "Belum ada data", value: 1 }]
            }
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">
            Kunjungan Minggu Ini
          </h3>

          <p className="mb-4 text-sm text-slate-500">
            Tren jumlah pasien per hari.
          </p>

          <VisitChart data={visitData} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">
            Top 5 Layanan Terpopuler
          </h3>

          <div className="mt-5 space-y-4">
            {topServices.length === 0 && (
              <p className="text-sm text-slate-500">
                Belum ada data layanan.
              </p>
            )}

            {topServices.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-extrabold text-blue-700">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {item.name}
                    </p>

                    <p className="text-sm font-bold text-slate-900">
                      {item.value}
                    </p>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${Math.min(100, item.value * 12)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Transaksi Terbaru
            </h3>

            <p className="text-sm text-slate-500">
              Daftar pembayaran terakhir.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">No. Transaksi</th>
                <th className="px-6 py-3">Pasien</th>
                <th className="px-6 py-3">Layanan</th>
                <th className="px-6 py-3">Dokter</th>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3 text-right">Jumlah</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {tx.code}
                  </td>

                  <td className="px-6 py-4">
                    {tx.patientId ? (
                      <Link
                        href={`/pasien/${tx.patientId}`}
                        className="font-bold text-blue-700 hover:underline"
                      >
                        {tx.patientName}
                      </Link>
                    ) : (
                      tx.patientName
                    )}
                  </td>

                  <td className="px-6 py-4">{tx.service.name}</td>

                  <td className="px-6 py-4">{tx.doctor.name}</td>

                  <td className="px-6 py-4">{formatDate(tx.date)}</td>

                  <td className="px-6 py-4 text-right font-bold">
                    {formatRupiah(tx.amount.toString())}
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {tx.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}

              {recentTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    Belum ada transaksi terbaru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
