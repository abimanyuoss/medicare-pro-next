import { TestTube2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/format";
import { createService, deleteService, updateService } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function LayananPage() {
  const services = await prisma.service.findMany({
    where: {
      active: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="fade-in grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">
          Tambah Layanan
        </h3>

        <form
          action={createService}
          className="mt-6 space-y-4"
          data-reset-on-flash="true"
        >
          <input
            name="name"
            required
            placeholder="Nama layanan"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <select
            name="category"
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="Konsultasi">Konsultasi</option>
            <option value="Laboratorium">Laboratorium</option>
            <option value="Radiologi">Radiologi</option>
            <option value="Tindakan">Tindakan Medis</option>
            <option value="Terapi">Terapi</option>
            <option value="Administrasi">Administrasi</option>
          </select>

          <input
            name="price"
            type="number"
            required
            placeholder="Harga"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <textarea
            name="description"
            rows={4}
            placeholder="Deskripsi"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <SubmitButton className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
            Simpan Layanan
          </SubmitButton>
        </form>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <article
            key={service.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <TestTube2 size={24} />
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              {service.category}
            </p>

            <h3 className="mt-2 text-lg font-extrabold text-slate-900">
              {service.name}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {service.description || "Tidak ada deskripsi."}
            </p>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xl font-extrabold text-slate-900">
              {formatRupiah(service.price.toString())}
            </div>

            <details className="mt-4 rounded-2xl bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-extrabold text-slate-700">
                Edit Layanan
              </summary>

              <form action={updateService} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={service.id} />

                <input
                  name="name"
                  required
                  defaultValue={service.name}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />

                <select
                  name="category"
                  required
                  defaultValue={service.category}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                >
                  <option value="Konsultasi">Konsultasi</option>
                  <option value="Laboratorium">Laboratorium</option>
                  <option value="Radiologi">Radiologi</option>
                  <option value="Tindakan">Tindakan Medis</option>
                  <option value="Terapi">Terapi</option>
                  <option value="Administrasi">Administrasi</option>
                </select>

                <input
                  name="price"
                  type="number"
                  required
                  min={0}
                  defaultValue={service.price.toString()}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />

                <textarea
                  name="description"
                  rows={3}
                  defaultValue={service.description ?? ""}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />

                <SubmitButton className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-extrabold text-white hover:bg-slate-700">
                  Simpan Perubahan
                </SubmitButton>
              </form>
            </details>

            <form action={deleteService} className="mt-4">
              <input type="hidden" name="id" value={service.id} />

              <SubmitButton
                pendingText="Menghapus..."
                className="w-full rounded-2xl bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100"
              >
                Hapus Layanan
              </SubmitButton>
            </form>
          </article>
        ))}

        {services.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            Belum ada data layanan aktif.
          </div>
        )}
      </section>
    </div>
  );
}
