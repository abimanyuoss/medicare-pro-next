import { CalendarDays, DollarSign, TrendingUp } from "lucide-react";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatRupiah, getStartOfDay, getStartOfMonth, getStartOfWeek, getStartOfYear } from "@/lib/format";
import { groupRevenueByCategory, groupRevenueByDoctor, groupRevenueByMonth } from "@/lib/analytics";
import RevenueChart from "@/components/charts/RevenueChart";
import StatCard from "@/components/StatCard";

export default async function PendapatanPage() {
  const [today, week, month, year, transactions] = await Promise.all([
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: TransactionStatus.LUNAS, date: { gte: getStartOfDay() } } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: TransactionStatus.LUNAS, date: { gte: getStartOfWeek() } } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: TransactionStatus.LUNAS, date: { gte: getStartOfMonth() } } }),
    prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: TransactionStatus.LUNAS, date: { gte: getStartOfYear() } } }),
    prisma.transaction.findMany({
      where: { date: { gte: getStartOfYear() } },
      include: { service: true, doctor: true }
    })
  ]);

  const yearlyData = groupRevenueByMonth(transactions, 12);
  const categoryData = groupRevenueByCategory(transactions).slice(0, 6);
  const doctorData = groupRevenueByDoctor(transactions).slice(0, 6);

  return (
    <div className="fade-in space-y-6">
      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard title="Pendapatan Hari Ini" value={formatRupiah(today._sum.amount?.toString())} icon={DollarSign} color="green" trend="Live" />
        <StatCard title="Pendapatan Minggu Ini" value={formatRupiah(week._sum.amount?.toString())} icon={CalendarDays} color="blue" />
        <StatCard title="Pendapatan Bulan Ini" value={formatRupiah(month._sum.amount?.toString())} icon={TrendingUp} color="purple" caption={`Tahun ini ${formatRupiah(year._sum.amount?.toString())}`} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">Analisis Pendapatan Tahunan</h3>
        <p className="mb-5 text-sm text-slate-500">Grafik pendapatan berdasarkan transaksi lunas.</p>
        <RevenueChart data={yearlyData} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">Pendapatan per Kategori Layanan</h3>
          <div className="mt-5 space-y-4">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="font-semibold text-slate-700">{item.name}</span>
                <span className="font-extrabold text-slate-900">{formatRupiah(item.pendapatan)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">Pendapatan per Dokter</h3>
          <div className="mt-5 space-y-4">
            {doctorData.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="font-semibold text-slate-700">{item.name}</span>
                <span className="font-extrabold text-slate-900">{formatRupiah(item.pendapatan)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
