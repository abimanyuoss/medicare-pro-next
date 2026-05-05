import Link from "next/link";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate, formatRupiah } from "@/lib/format";
import {
  appendTransactionFilterParams,
  parseTransactionFilters,
  TRANSACTION_PAGE_SIZE_OPTIONS,
  type TransactionFilterParams,
} from "@/lib/transaction-filters";
import {
  deleteTransaction,
  updateTransactionStatus,
} from "@/app/actions";
import TransactionForm from "@/components/TransactionForm";
import SubmitButton from "@/components/SubmitButton";

const statusLabels: Record<TransactionStatus, string> = {
  [TransactionStatus.LUNAS]: "Lunas",
  [TransactionStatus.BELUM_LUNAS]: "Belum Lunas",
  [TransactionStatus.BATAL]: "Batal",
};

function statusClass(status: TransactionStatus) {
  if (status === TransactionStatus.LUNAS) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === TransactionStatus.BELUM_LUNAS) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
}

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams?: TransactionFilterParams;
}) {
  const filters = parseTransactionFilters(searchParams);
  const {
    searchQuery,
    statusFilter,
    doctorFilter,
    serviceFilter,
    dateFrom,
    dateTo,
    page,
    pageSize,
    where,
  } = filters;
  const skip = (page - 1) * pageSize;

  const [transactions, totalTransactions, doctors, services, medicines] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: {
        date: "desc",
      },
      skip,
      take: pageSize,
      include: {
        doctor: true,
        service: true,
        medicines: {
          include: {
            medicine: true,
          },
        },
      },
    }),

    prisma.transaction.count({
      where,
    }),

    prisma.doctor.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.service.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.medicine.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  // Serialize data for client component
  const doctorsData = doctors.map((d) => ({ id: d.id, name: d.name }));
  const servicesData = services.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price.toString(),
  }));
  const medicinesData = medicines.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    dosage: m.dosage,
    stock: m.stock,
    unit: m.unit,
    price: m.price.toString(),
  }));
  const totalPages = Math.max(1, Math.ceil(totalTransactions / pageSize));
  const hasFilters = Boolean(
    searchQuery || statusFilter || doctorFilter || serviceFilter || dateFrom || dateTo
  );

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    appendTransactionFilterParams(params, filters);
    params.set("pageSize", String(pageSize));
    params.set("page", String(nextPage));

    return `/transaksi?${params.toString()}`;
  }

  function exportHref() {
    const params = new URLSearchParams();
    appendTransactionFilterParams(params, filters);
    return `/api/export/transaksi${params.toString() ? `?${params.toString()}` : ""}`;
  }

  return (
    <div className="fade-in grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">
          Tambah Transaksi Baru
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Pilih keluhan untuk menampilkan obat yang sesuai.
        </p>

        <TransactionForm
          doctors={doctorsData}
          services={servicesData}
          medicines={medicinesData}
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Daftar Transaksi
              </h3>

              <p className="text-sm text-slate-500">
                Menampilkan {transactions.length} dari {totalTransactions} transaksi
                {searchQuery ? ` untuk "${searchQuery}"` : ""}
                {statusFilter ? ` dengan status ${statusLabels[statusFilter]}` : ""}.
              </p>
            </div>

            {hasFilters && (
              <Link
                href="/transaksi"
                className="inline-flex w-fit rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
              >
                Hapus filter
              </Link>
            )}

            <a
              href={exportHref()}
              className="inline-flex w-fit rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              Export Filter
            </a>
          </div>

          <form className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-6">
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Cari pasien/kode"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Semua Status</option>
              <option value="LUNAS">Lunas</option>
              <option value="BELUM_LUNAS">Belum Lunas</option>
              <option value="BATAL">Batal</option>
            </select>

            <select
              name="doctorId"
              defaultValue={doctorFilter}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Semua Dokter</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>

            <select
              name="serviceId"
              defaultValue={serviceFilter}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Semua Layanan</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>

            <input
              name="dateFrom"
              type="date"
              defaultValue={dateFrom}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <input
              name="dateTo"
              type="date"
              defaultValue={dateTo}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <div className="flex gap-3 xl:col-span-6">
              <select
                name="pageSize"
                defaultValue={pageSize}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {TRANSACTION_PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} data
                  </option>
                ))}
              </select>

              <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-700">
                Terapkan Filter
              </button>
            </div>
          </form>

          {hasFilters && (
            <Link
              href="/transaksi"
              className="mt-3 hidden rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
            >
              Hapus filter
            </Link>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">No</th>
                <th className="px-6 py-3">Pasien</th>
                <th className="px-6 py-3">Keluhan</th>
                <th className="px-6 py-3">Layanan</th>
                <th className="px-6 py-3">Obat</th>
                <th className="px-6 py-3">Dokter</th>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3 text-right">Jumlah</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
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

                  <td className="px-6 py-4">
                    {tx.complaint ? (
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                        {tx.complaint}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4">{tx.service.name}</td>

                  <td className="px-6 py-4">
                    {tx.medicines.length > 0 ? (
                      <div className="space-y-1">
                        {tx.medicines.map((tm) => (
                          <div
                            key={tm.id}
                            className="text-xs"
                          >
                            <span className="font-bold text-slate-700">
                              {tm.medicine.name}
                            </span>{" "}
                            <span className="text-slate-400">
                              x{tm.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4">{tx.doctor.name}</td>

                  <td className="px-6 py-4">{formatDate(tx.date)}</td>

                  <td className="px-6 py-4 text-right font-bold">
                    {formatRupiah(tx.amount.toString())}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                        tx.status
                      )}`}
                    >
                      {tx.status.replace("_", " ")}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/transaksi/${tx.id}/struk`}
                        className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                      >
                        Cetak
                      </Link>

                      <form
                        action={updateTransactionStatus}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="id" value={tx.id} />

                        <select
                          name="status"
                          defaultValue={tx.status}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
                        >
                          <option value="LUNAS">Lunas</option>
                          <option value="BELUM_LUNAS">Belum</option>
                          <option value="BATAL">Batal</option>
                        </select>

                        <SubmitButton
                          pendingText="..."
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
                        >
                          OK
                        </SubmitButton>
                      </form>

                      <form action={deleteTransaction}>
                        <input type="hidden" name="id" value={tx.id} />

                        <SubmitButton
                          pendingText="..."
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          Hapus
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    {searchQuery || statusFilter
                      ? "Tidak ada transaksi yang cocok dengan filter."
                      : "Belum ada transaksi."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Halaman {page} dari {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={pageHref(Math.max(1, page - 1))}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${
                page <= 1
                  ? "pointer-events-none bg-slate-100 text-slate-400"
                  : "bg-slate-900 text-white hover:bg-slate-700"
              }`}
            >
              Sebelumnya
            </Link>

            <Link
              href={pageHref(Math.min(totalPages, page + 1))}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${
                page >= totalPages
                  ? "pointer-events-none bg-slate-100 text-slate-400"
                  : "bg-slate-900 text-white hover:bg-slate-700"
              }`}
            >
              Berikutnya
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
