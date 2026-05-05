import { Activity, CalendarDays, Clock, Users } from "lucide-react";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStartOfDay, getStartOfMonth, getStartOfWeek } from "@/lib/format";
import { groupServiceDistribution, groupVisitsByDay } from "@/lib/analytics";
import StatCard from "@/components/StatCard";
import VisitChart from "@/components/charts/VisitChart";

export default async function KunjunganPage() {
  const [today, week, month, transactions] = await Promise.all([
    prisma.transaction.count({ where: { date: { gte: getStartOfDay() }, status: { not: TransactionStatus.BATAL } } }),
    prisma.transaction.count({ where: { date: { gte: getStartOfWeek() }, status: { not: TransactionStatus.BATAL } } }),
    prisma.transaction.count({ where: { date: { gte: getStartOfMonth() }, status: { not: TransactionStatus.BATAL } } }),
    prisma.transaction.findMany({
      where: { date: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1) } },
      include: { service: true }
    })
  ]);

  const visitWeekData = groupVisitsByDay(transactions, 7);
  const visitMonthData = groupVisitsByDay(transactions, 30);
  const services = groupServiceDistribution(transactions).slice(0, 8);

  return (
    <div className="fade-in space-y-6">
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Kunjungan Hari Ini" value={today} icon={Users} color="green" />
        <StatCard title="Kunjungan Minggu Ini" value={week} icon={CalendarDays} color="blue" />
        <StatCard title="Kunjungan Bulan Ini" value={month} icon={Activity} color="purple" />
        <StatCard title="Rata-rata Harian" value={Math.round(month / Math.max(1, new Date().getDate()))} icon={Clock} color="orange" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">Kunjungan per Hari</h3>
          <p className="mb-4 text-sm text-slate-500">Data 7 hari terakhir.</p>
          <VisitChart data={visitWeekData} />
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">Tren Kunjungan Bulanan</h3>
          <p className="mb-4 text-sm text-slate-500">Data 30 hari terakhir.</p>
          <VisitChart data={visitMonthData} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">Kunjungan per Jenis Layanan</h3>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <div key={service.name} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">{service.name}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{service.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
