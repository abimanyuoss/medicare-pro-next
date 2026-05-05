import { Phone, Stethoscope } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createDoctor, deleteDoctor, updateDoctor } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function DokterPage() {
  const doctors = await prisma.doctor.findMany({
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
          Tambah Dokter
        </h3>

        <form
          action={createDoctor}
          className="mt-6 space-y-4"
          data-reset-on-flash="true"
        >
          <input
            name="name"
            required
            placeholder="Nama dokter"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <select
            name="specialty"
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            <option value="Dokter Umum">Dokter Umum</option>
            <option value="Spesialis Anak">Spesialis Anak</option>
            <option value="Penyakit Dalam">Penyakit Dalam</option>
            <option value="Spesialis Bedah">Spesialis Bedah</option>
            <option value="Dokter Gigi">Dokter Gigi</option>
            <option value="Spesialis Kandungan">Spesialis Kandungan</option>
            <option value="Spesialis THT">Spesialis THT</option>
          </select>

          <input
            name="phone"
            placeholder="No. telepon"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <input
            name="schedule"
            placeholder="Jadwal praktik"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <SubmitButton className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
            Simpan Dokter
          </SubmitButton>
        </form>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {doctors.map((doctor) => (
          <article
            key={doctor.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Stethoscope size={26} />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900">
              {doctor.name}
            </h3>

            <p className="mt-1 text-sm font-semibold text-blue-600">
              {doctor.specialty}
            </p>

            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p className="rounded-2xl bg-slate-50 p-3">
                {doctor.schedule || "Jadwal belum diatur"}
              </p>

              <p className="flex items-center gap-2">
                <Phone size={16} />
                {doctor.phone || "-"}
              </p>
            </div>

            <details className="mt-4 rounded-2xl bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-extrabold text-slate-700">
                Edit Dokter
              </summary>

              <form action={updateDoctor} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={doctor.id} />

                <input
                  name="name"
                  required
                  defaultValue={doctor.name}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />

                <select
                  name="specialty"
                  required
                  defaultValue={doctor.specialty}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                >
                  <option value="Dokter Umum">Dokter Umum</option>
                  <option value="Spesialis Anak">Spesialis Anak</option>
                  <option value="Penyakit Dalam">Penyakit Dalam</option>
                  <option value="Spesialis Bedah">Spesialis Bedah</option>
                  <option value="Dokter Gigi">Dokter Gigi</option>
                  <option value="Spesialis Kandungan">Spesialis Kandungan</option>
                  <option value="Spesialis THT">Spesialis THT</option>
                </select>

                <input
                  name="phone"
                  defaultValue={doctor.phone ?? ""}
                  placeholder="No. telepon"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />

                <input
                  name="schedule"
                  defaultValue={doctor.schedule ?? ""}
                  placeholder="Jadwal praktik"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />

                <SubmitButton className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-extrabold text-white hover:bg-slate-700">
                  Simpan Perubahan
                </SubmitButton>
              </form>
            </details>

            <form action={deleteDoctor} className="mt-4">
              <input type="hidden" name="id" value={doctor.id} />

              <SubmitButton
                pendingText="Menghapus..."
                className="w-full rounded-2xl bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100"
              >
                Hapus Dokter
              </SubmitButton>
            </form>
          </article>
        ))}

        {doctors.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            Belum ada data dokter aktif.
          </div>
        )}
      </section>
    </div>
  );
}
