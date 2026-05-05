import Link from "next/link";
import { notFound } from "next/navigation";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate, formatRupiah } from "@/lib/format";

function statusClass(status: TransactionStatus) {
  if (status === TransactionStatus.LUNAS) return "bg-emerald-50 text-emerald-700";
  if (status === TransactionStatus.BELUM_LUNAS) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export default async function RiwayatPasienPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const patient = await prisma.patient.findUnique({
    where: {
      id: params.id,
    },
  });

  if (!patient) notFound();

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        {
          patientId: patient.id,
        },
        {
          patientName: patient.name,
        },
      ],
    },
    orderBy: {
      date: "desc",
    },
    include: {
      doctor: true,
      service: true,
      medicines: {
        include: {
          medicine: true,
        },
      },
    },
  });

  const activeVisits = transactions.filter(
    (transaction) => transaction.status !== TransactionStatus.BATAL
  );
  const totalPaid = transactions
    .filter((transaction) => transaction.status === TransactionStatus.LUNAS)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalUnpaid = transactions
    .filter((transaction) => transaction.status === TransactionStatus.BELUM_LUNAS)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return (
    <div className="fade-in space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Link
              href="/transaksi"
              className="text-sm font-bold text-blue-700 hover:underline"
            >
              Kembali ke Transaksi
            </Link>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
              Riwayat Pasien: {patient.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Data kunjungan, layanan, obat, pembayaran, dan status tagihan.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <p className="font-bold text-slate-900">Kontak</p>
            <p className="mt-1 text-slate-500">
              Telepon: {patient.phone || "Belum diisi"}
            </p>
            <p className="text-slate-500">
              Alamat: {patient.address || "Belum diisi"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Total Kunjungan</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {activeVisits.length}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Total Pembayaran</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">
            {formatRupiah(totalPaid)}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Tagihan Belum Lunas</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">
            {formatRupiah(totalUnpaid)}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <h2 className="text-lg font-extrabold text-slate-900">
            Detail Riwayat Kunjungan
          </h2>
          <p className="text-sm text-slate-500">
            Menampilkan {transactions.length} transaksi pasien.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">No</th>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Layanan</th>
                <th className="px-6 py-3">Dokter</th>
                <th className="px-6 py-3">Obat</th>
                <th className="px-6 py-3 text-right">Jumlah</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {transaction.code}
                  </td>
                  <td className="px-6 py-4">{formatDate(transaction.date)}</td>
                  <td className="px-6 py-4">{transaction.service.name}</td>
                  <td className="px-6 py-4">{transaction.doctor.name}</td>
                  <td className="px-6 py-4">
                    {transaction.medicines.length > 0 ? (
                      <div className="space-y-1">
                        {transaction.medicines.map((item) => (
                          <p key={item.id} className="text-xs">
                            <span className="font-bold text-slate-700">
                              {item.medicine.name}
                            </span>{" "}
                            <span className="text-slate-400">x{item.quantity}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-bold">
                    {formatRupiah(transaction.amount.toString())}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                        transaction.status
                      )}`}
                    >
                      {transaction.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/transaksi/${transaction.id}/struk`}
                      className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                    >
                      Cetak
                    </Link>
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    Belum ada riwayat transaksi untuk pasien ini.
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
