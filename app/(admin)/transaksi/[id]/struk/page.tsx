import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatRupiah } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export default async function StrukTransaksiPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id: params.id,
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

  if (!transaction) notFound();

  const servicePrice =
    Number(transaction.amount) -
    transaction.medicines.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );

  return (
    <div className="mx-auto max-w-3xl space-y-5 print:max-w-none print:space-y-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/transaksi"
          className="rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Kembali
        </Link>
        <PrintButton />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                MediCare Pro
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Struk Pembayaran Klinik & Rumah Sakit
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                No. Transaksi
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-900">
                {transaction.code}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-b border-slate-200 py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-slate-500">Pasien</p>
            <p className="mt-1 font-extrabold text-slate-900">
              {transaction.patientName}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Tanggal</p>
            <p className="mt-1 font-extrabold text-slate-900">
              {formatDate(transaction.date)}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Dokter</p>
            <p className="mt-1 font-extrabold text-slate-900">
              {transaction.doctor.name}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Status</p>
            <p className="mt-1 font-extrabold text-slate-900">
              {transaction.status.replace("_", " ")}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-slate-500">Keluhan</p>
            <p className="mt-1 font-extrabold text-slate-900">
              {transaction.complaint || "-"}
            </p>
          </div>
        </div>

        <div className="py-6">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3">Item</th>
                <th className="py-3 text-center">Qty</th>
                <th className="py-3 text-right">Harga</th>
                <th className="py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 font-bold text-slate-900">
                  {transaction.service.name}
                </td>
                <td className="py-3 text-center">1</td>
                <td className="py-3 text-right">{formatRupiah(servicePrice)}</td>
                <td className="py-3 text-right font-bold">
                  {formatRupiah(servicePrice)}
                </td>
              </tr>

              {transaction.medicines.map((item) => (
                <tr key={item.id}>
                  <td className="py-3">
                    <p className="font-bold text-slate-900">
                      {item.medicine.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.medicine.dosage}
                    </p>
                  </td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">
                    {formatRupiah(item.price.toString())}
                  </td>
                  <td className="py-3 text-right font-bold">
                    {formatRupiah(Number(item.price) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="ml-auto max-w-xs space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total</span>
              <span className="text-xl font-extrabold text-slate-900">
                {formatRupiah(transaction.amount.toString())}
              </span>
            </div>
          </div>

          {transaction.notes && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 print:bg-white print:p-0">
              <span className="font-bold text-slate-800">Catatan: </span>
              {transaction.notes}
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            Terima kasih. Semoga lekas sehat.
          </p>
        </div>
      </section>
    </div>
  );
}
