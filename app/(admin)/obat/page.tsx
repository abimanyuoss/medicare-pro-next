import { Pill } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/format";
import {
  addMedicineStock,
  createMedicine,
  deleteMedicine,
  updateMedicine,
} from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

const COMPLAINT_CATEGORIES = [
  "Demam & Nyeri",
  "Batuk & Flu",
  "Infeksi",
  "Gangguan Pencernaan",
  "Alergi & Kulit",
  "Hipertensi",
  "Diabetes",
  "Vitamin & Suplemen",
];

function stockBadge(stock: number) {
  if (stock === 0) return "bg-red-100 text-red-700";
  if (stock <= 10) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function stockLabel(stock: number) {
  if (stock === 0) return "Habis";
  if (stock <= 10) return "Stok Rendah";
  return "Tersedia";
}

export default async function ObatPage() {
  const medicines = await prisma.medicine.findMany({
    where: {
      active: true,
    },
    orderBy: [
      { category: "asc" },
      { name: "asc" },
    ],
  });
  const lowStockMedicines = medicines.filter((medicine) => medicine.stock <= 10);

  return (
    <div className="fade-in grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">
          Tambah Obat
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Obat otomatis dikelompokkan berdasarkan kategori keluhan.
        </p>

        <form
          action={createMedicine}
          className="mt-6 space-y-4"
          data-reset-on-flash="true"
        >
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Nama Obat
            </label>

            <input
              name="name"
              required
              placeholder="e.g. Paracetamol 500mg"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Kategori Keluhan
            </label>

            <select
              name="category"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              {COMPLAINT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Dosis
              </label>

              <input
                name="dosage"
                required
                placeholder="e.g. 3x1 sehari"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Satuan
              </label>

              <select
                name="unit"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="tablet">Tablet</option>
                <option value="kapsul">Kapsul</option>
                <option value="sirup">Sirup</option>
                <option value="salep">Salep</option>
                <option value="tube">Tube</option>
                <option value="botol">Botol</option>
                <option value="sachet">Sachet</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Stok
              </label>

              <input
                name="stock"
                type="number"
                required
                min={0}
                placeholder="0"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Harga Satuan
              </label>

              <input
                name="price"
                type="number"
                required
                min={0}
                placeholder="0"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Deskripsi
            </label>

            <textarea
              name="description"
              rows={3}
              placeholder="Opsional"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <SubmitButton className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
            Simpan Obat
          </SubmitButton>
        </form>
      </section>

      <section>
        {lowStockMedicines.length > 0 && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50/70 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-extrabold text-amber-900">
                Stok Rendah
              </h3>
              <p className="text-sm text-amber-700">
                Obat berikut perlu segera ditambah stoknya.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
              {lowStockMedicines.map((medicine) => (
                <div
                  key={medicine.id}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-extrabold text-slate-900">
                        {medicine.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        Sisa {medicine.stock} {medicine.unit}
                      </p>
                    </div>

                    <form action={addMedicineStock} className="flex gap-2">
                      <input type="hidden" name="id" value={medicine.id} />
                      <input
                        name="amount"
                        type="number"
                        required
                        min={1}
                        defaultValue={10}
                        className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                      <SubmitButton
                        pendingText="..."
                        className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-amber-700"
                      >
                        Tambah Stok
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Daftar Obat
            </h3>

            <p className="text-sm text-slate-500">
              Menampilkan {medicines.length} obat aktif.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {medicines.map((med) => (
            <article
              key={med.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <Pill size={24} />
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${stockBadge(
                    med.stock
                  )}`}
                >
                  {stockLabel(med.stock)} ({med.stock})
                </span>
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                {med.category}
              </p>

              <h4 className="mt-1.5 text-base font-extrabold text-slate-900">
                {med.name}
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                {med.description || "Tidak ada deskripsi."}
              </p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">Dosis</span>
                  <span className="font-bold text-slate-800">{med.dosage}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">Satuan</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {med.unit}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2">
                  <span className="text-blue-600">Harga</span>
                  <span className="font-extrabold text-blue-700">
                    {formatRupiah(med.price.toString())}
                  </span>
                </div>
              </div>

              <details className="mt-4 rounded-2xl bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-extrabold text-slate-700">
                  Edit Obat
                </summary>

                <form action={updateMedicine} className="mt-4 space-y-3">
                  <input type="hidden" name="id" value={med.id} />

                  <input
                    name="name"
                    required
                    defaultValue={med.name}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />

                  <select
                    name="category"
                    required
                    defaultValue={med.category}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  >
                    {COMPLAINT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <input
                    name="dosage"
                    required
                    defaultValue={med.dosage}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name="stock"
                      type="number"
                      required
                      min={0}
                      defaultValue={med.stock}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                    />

                    <select
                      name="unit"
                      defaultValue={med.unit}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                    >
                      <option value="tablet">Tablet</option>
                      <option value="kapsul">Kapsul</option>
                      <option value="sirup">Sirup</option>
                      <option value="salep">Salep</option>
                      <option value="tube">Tube</option>
                      <option value="botol">Botol</option>
                      <option value="sachet">Sachet</option>
                    </select>
                  </div>

                  <input
                    name="price"
                    type="number"
                    required
                    min={0}
                    defaultValue={med.price.toString()}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />

                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={med.description ?? ""}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />

                  <SubmitButton className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-extrabold text-white hover:bg-slate-700">
                    Simpan Perubahan
                  </SubmitButton>
                </form>
              </details>

              <form action={deleteMedicine} className="mt-4">
                <input type="hidden" name="id" value={med.id} />

                <SubmitButton
                  pendingText="Menghapus..."
                  className="w-full rounded-2xl bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100"
                >
                  Hapus Obat
                </SubmitButton>
              </form>
            </article>
          ))}

          {medicines.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-2 2xl:col-span-3">
              Belum ada data obat aktif.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
