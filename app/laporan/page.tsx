import { Download, FileText, Printer } from "lucide-react";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate, formatRupiah, getStartOfMonth } from "@/lib/format";
import { groupRevenueByCategory, groupRevenueByDoctor, groupServiceDistribution } from "@/lib/analytics";

export default async function LaporanPage() {
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: getStartOfMonth() } },
    orderBy: { date: "desc" },
    include: { service: true, doctor: true }
  });

  const revenue = transactions
    .filter((tx) => tx.status === TransactionStatus.LUNAS)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const serviceData = groupServiceDistribution(transactions);
  const categoryData = groupRevenueByCategory(transactions);
  const doctorData = groupRevenueByDoctor(transactions);

  return (
    <div className="fade-in space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <FileText size={28} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Laporan Bulanan MediCare Pro</h3>
              <p className="text-sm text-slate-500">Periode {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 print:hidden">
            <a
              href="/api/export/excel"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700"
            >
              <Download size={17} />
              Export Excel
            </a>

            <button className="hidden items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white sm:inline-flex">
              <Printer size={17} />
              Ctrl + P
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-700">Total Transaksi</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{transactions.length}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-700">Total Pendapatan</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{formatRupiah(revenue)}</p>
          </div>
          <div className="rounded-2xl bg-violet-50 p-5">
            <p className="text-sm font-semibold text-violet-700">Layanan Terpopuler</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{serviceData[0]?.name ?? "-"}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">Kunjungan per Layanan</h3>
          <table className="mt-4 w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Layanan</th><th className="px-4 py-3 text-right">Jumlah</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceData.map((item) => (
                <tr key={item.name}><td className="px-4 py-3">{item.name}</td><td className="px-4 py-3 text-right font-bold">{item.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900">Performa Dokter</h3>
          <table className="mt-4 w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Dokter</th><th className="px-4 py-3 text-right">Pendapatan</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctorData.map((item) => (
                <tr key={item.name}><td className="px-4 py-3">{item.name}</td><td className="px-4 py-3 text-right font-bold">{formatRupiah(item.pendapatan)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <h3 className="text-lg font-extrabold text-slate-900">Detail Transaksi Bulan Ini</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">No</th>
                <th className="px-6 py-3">Pasien</th>
                <th className="px-6 py-3">Layanan</th>
                <th className="px-6 py-3">Dokter</th>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-6 py-4 font-bold">{tx.code}</td>
                  <td className="px-6 py-4">{tx.patientName}</td>
                  <td className="px-6 py-4">{tx.service.name}</td>
                  <td className="px-6 py-4">{tx.doctor.name}</td>
                  <td className="px-6 py-4">{formatDate(tx.date)}</td>
                  <td className="px-6 py-4 text-right font-bold">{formatRupiah(tx.amount.toString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
