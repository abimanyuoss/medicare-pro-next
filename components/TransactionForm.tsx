"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Minus, Pill, X } from "lucide-react";
import { createTransaction } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";

type ServiceData = {
  id: string;
  name: string;
  price: string;
};

type DoctorData = {
  id: string;
  name: string;
};

type MedicineData = {
  id: string;
  name: string;
  category: string;
  dosage: string;
  stock: number;
  unit: string;
  price: string;
};

type SelectedMedicine = {
  id: string;
  name: string;
  dosage: string;
  unit: string;
  price: number;
  stock: number;
  quantity: number;
};

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

function formatRp(num: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

export default function TransactionForm({
  doctors,
  services,
  medicines,
}: {
  doctors: DoctorData[];
  services: ServiceData[];
  medicines: MedicineData[];
}) {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [complaint, setComplaint] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedMedicines, setSelectedMedicines] = useState<SelectedMedicine[]>([]);

  const resetForm = useCallback(() => {
    formRef.current?.reset();
    setComplaint("");
    setSelectedServiceId("");
    setSelectedMedicines([]);
  }, []);

  useEffect(() => {
    window.addEventListener("medicare:flash-success", resetForm);

    return () => {
      window.removeEventListener("medicare:flash-success", resetForm);
    };
  }, [resetForm]);

  useEffect(() => {
    if (searchParams.get("flash")) {
      resetForm();
    }
  }, [resetForm, searchParams]);

  // Filter medicines by selected complaint
  const filteredMedicines = complaint
    ? medicines.filter((m) => m.category === complaint && m.stock > 0)
    : [];

  // Calculate totals
  const servicePrice =
    services.find((s) => s.id === selectedServiceId)
      ? Number(services.find((s) => s.id === selectedServiceId)!.price)
      : 0;

  const medicineTotal = selectedMedicines.reduce(
    (sum, m) => sum + m.price * m.quantity,
    0
  );

  const grandTotal = servicePrice + medicineTotal;

  function addMedicine(medId: string) {
    if (selectedMedicines.find((m) => m.id === medId)) return;

    const med = medicines.find((m) => m.id === medId);
    if (!med) return;

    setSelectedMedicines((prev) => [
      ...prev,
      {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        unit: med.unit,
        price: Number(med.price),
        stock: med.stock,
        quantity: 1,
      },
    ]);
  }

  function removeMedicine(medId: string) {
    setSelectedMedicines((prev) => prev.filter((m) => m.id !== medId));
  }

  function updateQuantity(medId: string, qty: number) {
    setSelectedMedicines((prev) =>
      prev.map((m) =>
        m.id === medId ? { ...m, quantity: Math.max(1, Math.min(qty, m.stock)) } : m
      )
    );
  }

  return (
    <form
      ref={formRef}
      action={createTransaction}
      className="mt-6 space-y-4"
      data-reset-on-flash="true"
    >
      {/* Nama Pasien */}
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">
          Nama Pasien
        </label>

        <input
          name="patientName"
          required
          placeholder="Masukkan nama pasien"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            No. Telepon Pasien
          </label>

          <input
            name="patientPhone"
            type="tel"
            placeholder="Opsional"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Alamat Pasien
          </label>

          <input
            name="patientAddress"
            placeholder="Opsional"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Layanan */}
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">
          Layanan
        </label>

        <select
          name="serviceId"
          required
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">Pilih layanan</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} - {formatRp(Number(service.price))}
            </option>
          ))}
        </select>
      </div>

      {/* Dokter */}
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">
          Dokter
        </label>

        <select
          name="doctorId"
          required
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">Pilih dokter</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name}
            </option>
          ))}
        </select>
      </div>

      {/* Keluhan Pasien */}
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">
          Keluhan Pasien
        </label>

        <select
          name="complaint"
          value={complaint}
          onChange={(e) => {
            setComplaint(e.target.value);
            setSelectedMedicines([]);
          }}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        >
          <option value="">Pilih keluhan (opsional)</option>
          {COMPLAINT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Pilih Obat - hanya muncul jika keluhan dipilih */}
      {complaint && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
          <label className="mb-2 block text-sm font-bold text-violet-700">
            <span className="inline-flex items-center gap-2">
              <Pill size={16} />
              Pilih Obat Sesuai Keluhan: {complaint}
            </span>
          </label>

          {filteredMedicines.length === 0 ? (
            <p className="text-sm text-slate-500">
              Tidak ada obat tersedia untuk keluhan ini.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredMedicines.map((med) => {
                const isSelected = selectedMedicines.some(
                  (m) => m.id === med.id
                );

                return (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() =>
                      isSelected ? removeMedicine(med.id) : addMedicine(med.id)
                    }
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${
                      isSelected
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                        : "bg-white text-slate-700 hover:bg-violet-100"
                    }`}
                  >
                    <div>
                      <p className="font-bold">{med.name}</p>
                      <p
                        className={`text-xs ${
                          isSelected ? "text-violet-200" : "text-slate-400"
                        }`}
                      >
                        {med.dosage} - Stok: {med.stock} {med.unit}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        {formatRp(Number(med.price))}
                      </p>
                      <p
                        className={`text-xs ${
                          isSelected ? "text-violet-200" : "text-slate-400"
                        }`}
                      >
                        per {med.unit}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Daftar obat yang dipilih + jumlah */}
      {selectedMedicines.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="mb-3 text-sm font-bold text-emerald-700">
            <span className="inline-flex items-center gap-2">
              <Check size={16} />
              Obat Dipilih ({selectedMedicines.length})
            </span>
          </p>

          <div className="space-y-3">
            {selectedMedicines.map((med) => (
              <div
                key={med.id}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {med.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {med.dosage} - {formatRp(med.price)}/{med.unit}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(med.id, med.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200"
                    aria-label={`Kurangi ${med.name}`}
                  >
                    <Minus size={14} />
                  </button>

                  <span className="w-8 text-center text-sm font-bold text-slate-800">
                    {med.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateQuantity(med.id, med.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200"
                  >
                    +
                  </button>
                </div>

                <p className="w-24 text-right text-sm font-extrabold text-slate-900">
                  {formatRp(med.price * med.quantity)}
                </p>

                <button
                  type="button"
                  onClick={() => removeMedicine(med.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Hapus ${med.name}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden field to pass medicine data */}
      <input
        type="hidden"
        name="medicines"
        value={JSON.stringify(
          selectedMedicines.map((m) => ({ id: m.id, quantity: m.quantity }))
        )}
      />

      {/* Tanggal */}
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">
          Tanggal
        </label>

        <input
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      {/* Status */}
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">
          Status
        </label>

        <select
          name="status"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        >
          <option value="LUNAS">Lunas</option>
          <option value="BELUM_LUNAS">Belum Lunas</option>
          <option value="BATAL">Batal</option>
        </select>
      </div>

      {/* Catatan */}
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">
          Catatan
        </label>

        <textarea
          name="notes"
          rows={3}
          placeholder="Opsional"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      {/* Ringkasan Biaya */}
      {(selectedServiceId || selectedMedicines.length > 0) && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-sm">
          <p className="mb-2 font-bold text-blue-700">Ringkasan Biaya</p>

          {selectedServiceId && (
            <div className="flex justify-between text-slate-600">
              <span>Layanan</span>
              <span className="font-bold">{formatRp(servicePrice)}</span>
            </div>
          )}

          {selectedMedicines.length > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>
                Obat ({selectedMedicines.length} item)
              </span>
              <span className="font-bold">{formatRp(medicineTotal)}</span>
            </div>
          )}

          <div className="mt-2 flex justify-between border-t border-blue-200 pt-2">
            <span className="font-extrabold text-blue-800">Total</span>
            <span className="text-lg font-extrabold text-blue-800">
              {formatRp(grandTotal)}
            </span>
          </div>
        </div>
      )}

      <SubmitButton className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
        Simpan Transaksi
      </SubmitButton>
    </form>
  );
}
