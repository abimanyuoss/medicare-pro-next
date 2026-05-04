import { PrismaClient, TransactionStatus } from "@prisma/client";

const prisma = new PrismaClient();

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  await prisma.transactionMedicine.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.service.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.medicine.deleteMany();

  const doctors = await prisma.doctor.createManyAndReturn({
    data: [
      { name: "dr. Andika Pratama", specialty: "Dokter Umum", phone: "0812-1111-2222", schedule: "Senin-Jumat, 08:00-15:00" },
      { name: "dr. Sinta Maharani, Sp.A", specialty: "Spesialis Anak", phone: "0812-3333-4444", schedule: "Senin, Rabu, Jumat, 09:00-14:00" },
      { name: "dr. Bima Santoso, Sp.PD", specialty: "Penyakit Dalam", phone: "0812-5555-6666", schedule: "Selasa-Kamis, 10:00-16:00" },
      { name: "drg. Rara Amelia", specialty: "Dokter Gigi", phone: "0812-7777-8888", schedule: "Senin-Sabtu, 09:00-13:00" },
      { name: "dr. Dimas Arya, Sp.B", specialty: "Spesialis Bedah", phone: "0812-9999-0000", schedule: "Rabu-Jumat, 13:00-18:00" }
    ]
  });

  const services = await prisma.service.createManyAndReturn({
    data: [
      { name: "Konsultasi Umum", category: "Konsultasi", price: 150000, description: "Pemeriksaan dan konsultasi dengan dokter umum" },
      { name: "Konsultasi Spesialis", category: "Konsultasi", price: 250000, description: "Pemeriksaan dengan dokter spesialis" },
      { name: "Laboratorium Dasar", category: "Laboratorium", price: 200000, description: "Pemeriksaan darah lengkap, urine, dan feses" },
      { name: "Radiologi Rontgen", category: "Radiologi", price: 300000, description: "Pemeriksaan rontgen berbagai bagian tubuh" },
      { name: "Fisioterapi", category: "Terapi", price: 180000, description: "Terapi fisik dan rehabilitasi" },
      { name: "Tindakan Medis", category: "Tindakan", price: 350000, description: "Tindakan medis ringan sampai sedang" }
    ]
  });

  // Seed medicines with complaint categories
  const medicines = await prisma.medicine.createManyAndReturn({
    data: [
      // Demam & Nyeri
      { name: "Paracetamol 500mg", category: "Demam & Nyeri", dosage: "3x1 sehari", stock: 200, unit: "tablet", price: 1500, description: "Pereda demam dan nyeri ringan" },
      { name: "Ibuprofen 400mg", category: "Demam & Nyeri", dosage: "3x1 sehari setelah makan", stock: 150, unit: "tablet", price: 2500, description: "Anti-inflamasi dan pereda nyeri" },
      { name: "Aspirin 100mg", category: "Demam & Nyeri", dosage: "1x1 sehari", stock: 100, unit: "tablet", price: 1800, description: "Pereda nyeri dan anti-platelet" },

      // Batuk & Flu
      { name: "Ambroxol 30mg", category: "Batuk & Flu", dosage: "3x1 sehari", stock: 180, unit: "tablet", price: 2000, description: "Pengencer dahak" },
      { name: "Dextromethorphan 15mg", category: "Batuk & Flu", dosage: "3x1 sehari", stock: 120, unit: "tablet", price: 2200, description: "Penekan batuk kering" },
      { name: "CTM 4mg", category: "Batuk & Flu", dosage: "3x1 sehari", stock: 250, unit: "tablet", price: 800, description: "Antihistamin untuk flu dan pilek" },

      // Infeksi
      { name: "Amoxicillin 500mg", category: "Infeksi", dosage: "3x1 sehari", stock: 100, unit: "kapsul", price: 3500, description: "Antibiotik spektrum luas" },
      { name: "Cefadroxil 500mg", category: "Infeksi", dosage: "2x1 sehari", stock: 80, unit: "kapsul", price: 5000, description: "Antibiotik sefalosporin generasi pertama" },
      { name: "Ciprofloxacin 500mg", category: "Infeksi", dosage: "2x1 sehari", stock: 60, unit: "tablet", price: 4500, description: "Antibiotik fluorokuinolon" },

      // Gangguan Pencernaan
      { name: "Antasida DOEN", category: "Gangguan Pencernaan", dosage: "3x1 sehari sebelum makan", stock: 150, unit: "tablet", price: 1200, description: "Penetral asam lambung" },
      { name: "Omeprazole 20mg", category: "Gangguan Pencernaan", dosage: "1x1 sehari sebelum makan", stock: 90, unit: "kapsul", price: 3000, description: "Penghambat pompa proton" },
      { name: "Loperamide 2mg", category: "Gangguan Pencernaan", dosage: "Dosis awal 2 kapsul, lanjut 1 kapsul", stock: 100, unit: "kapsul", price: 2500, description: "Anti-diare" },

      // Alergi & Kulit
      { name: "Cetirizine 10mg", category: "Alergi & Kulit", dosage: "1x1 sehari", stock: 200, unit: "tablet", price: 1500, description: "Antihistamin generasi kedua" },
      { name: "Loratadine 10mg", category: "Alergi & Kulit", dosage: "1x1 sehari", stock: 160, unit: "tablet", price: 2000, description: "Antihistamin non-sedatif" },
      { name: "Hydrocortisone Cream 2.5%", category: "Alergi & Kulit", dosage: "Oleskan 2-3x sehari", stock: 50, unit: "tube", price: 15000, description: "Krim anti-inflamasi kulit" },

      // Hipertensi
      { name: "Amlodipine 5mg", category: "Hipertensi", dosage: "1x1 sehari", stock: 120, unit: "tablet", price: 3000, description: "Penghambat kanal kalsium" },
      { name: "Captopril 25mg", category: "Hipertensi", dosage: "2-3x1 sehari", stock: 100, unit: "tablet", price: 2500, description: "ACE inhibitor" },
      { name: "Valsartan 80mg", category: "Hipertensi", dosage: "1x1 sehari", stock: 80, unit: "tablet", price: 5500, description: "ARB untuk hipertensi" },

      // Diabetes
      { name: "Metformin 500mg", category: "Diabetes", dosage: "2-3x1 sehari setelah makan", stock: 150, unit: "tablet", price: 2000, description: "Anti-diabetes oral lini pertama" },
      { name: "Glibenclamide 5mg", category: "Diabetes", dosage: "1-2x1 sehari", stock: 100, unit: "tablet", price: 1800, description: "Sulfonilurea untuk diabetes" },
      { name: "Acarbose 50mg", category: "Diabetes", dosage: "3x1 sehari bersama makan", stock: 70, unit: "tablet", price: 4000, description: "Penghambat alfa-glukosidase" },

      // Vitamin & Suplemen
      { name: "Vitamin C 500mg", category: "Vitamin & Suplemen", dosage: "1x1 sehari", stock: 300, unit: "tablet", price: 1000, description: "Suplemen daya tahan tubuh" },
      { name: "Vitamin B Complex", category: "Vitamin & Suplemen", dosage: "1x1 sehari", stock: 200, unit: "tablet", price: 1500, description: "Multivitamin B untuk metabolisme" },
      { name: "Zinc 20mg", category: "Vitamin & Suplemen", dosage: "1x1 sehari", stock: 180, unit: "tablet", price: 2000, description: "Suplemen mineral untuk imunitas" },
    ]
  });

  const patientNames = [
    "Agus Saputra", "Rina Wulandari", "Siti Aminah", "Dewi Kartika", "Fajar Nugroho",
    "Maya Lestari", "Hendra Wijaya", "Putri Anggraini", "Rizky Ramadhan", "Nur Hidayah",
    "Budi Santoso", "Yulia Permata", "Dian Prasetyo", "Tono Prabowo", "Ayu Safitri"
  ];

  const patients = await Promise.all(
    patientNames.map((name, index) =>
      prisma.patient.create({
        data: {
          name,
          phone: `0812-${String(index + 1000).padStart(4, "0")}-${String(index + 2000).padStart(4, "0")}`,
          address: "Wonosobo, Jawa Tengah"
        }
      })
    )
  );

  const complaints = [
    "Demam & Nyeri", "Batuk & Flu", "Infeksi", "Gangguan Pencernaan",
    "Alergi & Kulit", "Hipertensi", "Diabetes", "Vitamin & Suplemen"
  ];

  const today = new Date();

  for (let index = 0; index < 55; index++) {
    const service = randomItem(services);
    const doctor = randomItem(doctors);
    const patient = randomItem(patients);
    const date = addDays(today, -Math.floor(Math.random() * 170));
    const status = Math.random() > 0.12 ? TransactionStatus.LUNAS : TransactionStatus.BELUM_LUNAS;
    const complaint = randomItem(complaints);

    // Pick 1-3 random medicines matching the complaint
    const matchingMeds = medicines.filter(m => m.category === complaint);
    const medCount = Math.min(matchingMeds.length, Math.floor(Math.random() * 3) + 1);
    const selectedMeds = matchingMeds.sort(() => Math.random() - 0.5).slice(0, medCount);

    const medicineTotal = selectedMeds.reduce((sum, m) => sum + Number(m.price), 0);

    await prisma.transaction.create({
      data: {
        code: `TRX-${date.getFullYear()}-${String(index + 1).padStart(4, "0")}`,
        patientName: patient.name,
        patientId: patient.id,
        doctorId: doctor.id,
        serviceId: service.id,
        complaint,
        date,
        amount: Number(service.price) + medicineTotal,
        status,
        notes: index % 7 === 0 ? "Kontrol lanjutan" : null,
        medicines: {
          create: selectedMeds.map(med => ({
            medicineId: med.id,
            quantity: 1,
            price: med.price
          }))
        }
      }
    });
  }

  console.log("Seed selesai. Data dummy MediCare Pro berhasil dibuat (termasuk obat).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
