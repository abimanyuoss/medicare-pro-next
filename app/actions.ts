"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionMaxAge,
  verifyAdminCredentials,
} from "@/lib/auth";

function required(value: FormDataEntryValue | null, name: string) {
  if (!value || String(value).trim() === "") {
    throw new Error(`${name} wajib diisi`);
  }

  return String(value).trim();
}

function optional(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

function toNumber(value: FormDataEntryValue | null, name: string, min = 0) {
  const number = Number(required(value, name));
  if (!Number.isFinite(number) || number < min) {
    throw new Error(`${name} tidak valid`);
  }

  return number;
}

function toPositiveInt(value: unknown, name: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} tidak valid`);
  }

  return number;
}

function toNonNegativeInt(value: unknown, name: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${name} tidak valid`);
  }

  return number;
}

function toDate(value: FormDataEntryValue | null, name: string) {
  const date = new Date(required(value, name));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${name} tidak valid`);
  }

  return date;
}

function toStatus(value: string): TransactionStatus {
  if (value === "BELUM_LUNAS") return TransactionStatus.BELUM_LUNAS;
  if (value === "BATAL") return TransactionStatus.BATAL;

  return TransactionStatus.LUNAS;
}

function revalidateDashboardPages() {
  revalidatePath("/");
  revalidatePath("/pendapatan");
  revalidatePath("/kunjungan");
  revalidatePath("/transaksi");
  revalidatePath("/layanan");
  revalidatePath("/dokter");
  revalidatePath("/laporan");
  revalidatePath("/obat");
}

function setFlash(title: string, description?: string) {
  cookies().set(
    "medicare_flash",
    encodeURIComponent(JSON.stringify({ title, description })),
    {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30,
    }
  );
}

function flashRedirect(path: string): never {
  redirect(`${path}?flash=${Date.now()}`);
}

export async function login(formData: FormData) {
  const username = required(formData.get("username"), "Username");
  const password = required(formData.get("password"), "Password");

  if (!verifyAdminCredentials(username, password)) {
    redirect("/login?error=1");
  }

  const sessionToken = await createSessionToken(username);
  cookies().set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAge(),
  });

  setFlash("Login berhasil", "Selamat datang kembali di MediCare Pro.");
  flashRedirect("/");
}

export async function logout() {
  cookies().delete(getSessionCookieName());
  redirect("/login");
}

export async function createDoctor(formData: FormData) {
  await prisma.doctor.create({
    data: {
      name: required(formData.get("name"), "Nama dokter"),
      specialty: required(formData.get("specialty"), "Spesialisasi"),
      phone: optional(formData.get("phone")),
      schedule: optional(formData.get("schedule")),
    },
  });

  revalidateDashboardPages();
  setFlash("Dokter berhasil disimpan", "Data dokter baru sudah masuk ke sistem.");
  flashRedirect("/dokter");
}

export async function deleteDoctor(formData: FormData) {
  const id = required(formData.get("id"), "ID dokter");

  await prisma.doctor.update({
    where: {
      id,
    },
    data: {
      active: false,
    },
  });

  revalidateDashboardPages();
  setFlash("Dokter berhasil dihapus", "Data dokter dipindahkan dari daftar aktif.");
  flashRedirect("/dokter");
}

export async function updateDoctor(formData: FormData) {
  const id = required(formData.get("id"), "ID dokter");

  await prisma.doctor.update({
    where: {
      id,
    },
    data: {
      name: required(formData.get("name"), "Nama dokter"),
      specialty: required(formData.get("specialty"), "Spesialisasi"),
      phone: optional(formData.get("phone")),
      schedule: optional(formData.get("schedule")),
    },
  });

  revalidateDashboardPages();
  setFlash("Dokter berhasil diperbarui", "Perubahan data dokter sudah tersimpan.");
  flashRedirect("/dokter");
}

export async function createService(formData: FormData) {
  await prisma.service.create({
    data: {
      name: required(formData.get("name"), "Nama layanan"),
      category: required(formData.get("category"), "Kategori"),
      price: toNumber(formData.get("price"), "Harga", 0),
      description: optional(formData.get("description")),
    },
  });

  revalidateDashboardPages();
  setFlash("Layanan berhasil disimpan", "Data layanan baru sudah masuk ke sistem.");
  flashRedirect("/layanan");
}

export async function deleteService(formData: FormData) {
  const id = required(formData.get("id"), "ID layanan");

  await prisma.service.update({
    where: {
      id,
    },
    data: {
      active: false,
    },
  });

  revalidateDashboardPages();
  setFlash("Layanan berhasil dihapus", "Data layanan dipindahkan dari daftar aktif.");
  flashRedirect("/layanan");
}

export async function updateService(formData: FormData) {
  const id = required(formData.get("id"), "ID layanan");

  await prisma.service.update({
    where: {
      id,
    },
    data: {
      name: required(formData.get("name"), "Nama layanan"),
      category: required(formData.get("category"), "Kategori"),
      price: toNumber(formData.get("price"), "Harga", 0),
      description: optional(formData.get("description")),
    },
  });

  revalidateDashboardPages();
  setFlash("Layanan berhasil diperbarui", "Perubahan data layanan sudah tersimpan.");
  flashRedirect("/layanan");
}

export async function createMedicine(formData: FormData) {
  await prisma.medicine.create({
    data: {
      name: required(formData.get("name"), "Nama obat"),
      category: required(formData.get("category"), "Kategori keluhan"),
      dosage: required(formData.get("dosage"), "Dosis"),
      stock: toNonNegativeInt(formData.get("stock"), "Stok"),
      unit: required(formData.get("unit"), "Satuan"),
      price: toNumber(formData.get("price"), "Harga", 0),
      description: optional(formData.get("description")),
    },
  });

  revalidateDashboardPages();
  setFlash("Obat berhasil disimpan", "Data obat baru sudah masuk ke sistem.");
  flashRedirect("/obat");
}

export async function updateMedicine(formData: FormData) {
  const id = required(formData.get("id"), "ID obat");

  await prisma.medicine.update({
    where: {
      id,
    },
    data: {
      name: required(formData.get("name"), "Nama obat"),
      category: required(formData.get("category"), "Kategori keluhan"),
      dosage: required(formData.get("dosage"), "Dosis"),
      stock: toNonNegativeInt(formData.get("stock"), "Stok"),
      unit: required(formData.get("unit"), "Satuan"),
      price: toNumber(formData.get("price"), "Harga", 0),
      description: optional(formData.get("description")),
    },
  });

  revalidateDashboardPages();
  setFlash("Obat berhasil diperbarui", "Perubahan data obat sudah tersimpan.");
  flashRedirect("/obat");
}

export async function addMedicineStock(formData: FormData) {
  const id = required(formData.get("id"), "ID obat");
  const amount = toPositiveInt(formData.get("amount"), "Jumlah stok");

  await prisma.medicine.update({
    where: {
      id,
    },
    data: {
      stock: {
        increment: amount,
      },
    },
  });

  revalidateDashboardPages();
  setFlash("Stok obat berhasil ditambah", `${amount} stok sudah masuk ke inventori.`);
  flashRedirect("/obat");
}

export async function deleteMedicine(formData: FormData) {
  const id = required(formData.get("id"), "ID obat");

  await prisma.medicine.update({
    where: {
      id,
    },
    data: {
      active: false,
    },
  });

  revalidateDashboardPages();
  setFlash("Obat berhasil dihapus", "Data obat dipindahkan dari daftar aktif.");
  flashRedirect("/obat");
}

export async function createTransaction(formData: FormData) {
  const patientName = required(formData.get("patientName"), "Nama pasien");
  const patientPhone = optional(formData.get("patientPhone"));
  const patientAddress = optional(formData.get("patientAddress"));
  const serviceId = required(formData.get("serviceId"), "Layanan");
  const doctorId = required(formData.get("doctorId"), "Dokter");
  const date = toDate(formData.get("date"), "Tanggal");
  const status = toStatus(String(formData.get("status") || "LUNAS"));
  const complaint = optional(formData.get("complaint"));

  const medicinesRaw = String(formData.get("medicines") || "[]");
  let medicineItems: { id: string; quantity: number }[] = [];
  try {
    medicineItems = JSON.parse(medicinesRaw);
  } catch {
    medicineItems = [];
  }

  medicineItems = medicineItems.map((item) => ({
    id: required(String(item.id || ""), "ID obat"),
    quantity: toPositiveInt(item.quantity, "Jumlah obat"),
  }));

  const code = `TRX-${Date.now()}`;

  await prisma.$transaction(async (tx) => {
    const [service, doctor] = await Promise.all([
      tx.service.findFirst({
        where: {
          id: serviceId,
          active: true,
        },
      }),
      tx.doctor.findFirst({
        where: {
          id: doctorId,
          active: true,
        },
      }),
    ]);

    if (!service) throw new Error("Layanan tidak ditemukan atau tidak aktif");
    if (!doctor) throw new Error("Dokter tidak ditemukan atau tidak aktif");

    const patientUpdateData = {
      ...(patientPhone ? { phone: patientPhone } : {}),
      ...(patientAddress ? { address: patientAddress } : {}),
    };

    const patient = await tx.patient.upsert({
      where: {
        name: patientName,
      },
      update: patientUpdateData,
      create: {
        name: patientName,
        phone: patientPhone,
        address: patientAddress,
      },
    });

    let medicineTotal = 0;
    const medicineCreateData: {
      medicineId: string;
      quantity: number;
      price: number;
    }[] = [];

    if (medicineItems.length > 0) {
      const medicineIds = Array.from(new Set(medicineItems.map((m) => m.id)));
      const medicinesFromDb = await tx.medicine.findMany({
        where: { id: { in: medicineIds }, active: true },
      });

      for (const item of medicineItems) {
        const med = medicinesFromDb.find((m) => m.id === item.id);
        if (!med) throw new Error("Obat tidak ditemukan atau tidak aktif");
        if (med.stock < item.quantity) {
          throw new Error(`Stok ${med.name} tidak cukup`);
        }

        const stockUpdate = await tx.medicine.updateMany({
          where: {
            id: med.id,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new Error(`Stok ${med.name} tidak cukup`);
        }

        const itemTotal = Number(med.price) * item.quantity;
        medicineTotal += itemTotal;
        medicineCreateData.push({
          medicineId: med.id,
          quantity: item.quantity,
          price: Number(med.price),
        });
      }
    }

    await tx.transaction.create({
      data: {
        code,
        patientName,
        patientId: patient.id,
        serviceId,
        doctorId,
        complaint,
        date,
        amount: Number(service.price) + medicineTotal,
        status,
        notes: optional(formData.get("notes")),
        medicines: {
          create: medicineCreateData,
        },
      },
    });
  });

  revalidateDashboardPages();
  setFlash("Transaksi berhasil disimpan", "Data transaksi dan stok obat sudah diperbarui.");
  flashRedirect("/transaksi");
}

export async function updateTransactionStatus(formData: FormData) {
  const id = required(formData.get("id"), "ID transaksi");
  const status = toStatus(String(formData.get("status") || "LUNAS"));

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        medicines: true,
      },
    });

    if (transaction.status !== TransactionStatus.BATAL && status === TransactionStatus.BATAL) {
      for (const item of transaction.medicines) {
        await tx.medicine.update({
          where: {
            id: item.medicineId,
          },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    if (transaction.status === TransactionStatus.BATAL && status !== TransactionStatus.BATAL) {
      for (const item of transaction.medicines) {
        const stockUpdate = await tx.medicine.updateMany({
          where: {
            id: item.medicineId,
            active: true,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new Error("Stok obat tidak cukup untuk mengaktifkan transaksi");
        }
      }
    }

    await tx.transaction.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  });

  revalidateDashboardPages();
  setFlash("Status transaksi diperbarui", "Perubahan status dan stok obat sudah tersimpan.");
  flashRedirect("/transaksi");
}

export async function deleteTransaction(formData: FormData) {
  const id = required(formData.get("id"), "ID transaksi");

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        medicines: true,
      },
    });

    if (transaction.status !== TransactionStatus.BATAL) {
      for (const item of transaction.medicines) {
        await tx.medicine.update({
          where: {
            id: item.medicineId,
          },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    await tx.transaction.delete({
      where: {
        id,
      },
    });
  });

  revalidateDashboardPages();
  setFlash("Transaksi berhasil dihapus", "Data transaksi dihapus dan stok obat sudah disesuaikan.");
  flashRedirect("/transaksi");
}
