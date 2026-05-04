# MediCare Pro - Next.js + React + Neon PostgreSQL

Aplikasi dashboard klinik/rumah sakit berbasis Next.js App Router, React, Tailwind CSS, Prisma, dan Neon PostgreSQL.

## Fitur

- Dashboard statistik pendapatan, kunjungan, transaksi, dokter, pasien, dan layanan.
- Grafik pendapatan, distribusi layanan, dan kunjungan.
- Halaman pendapatan, kunjungan, transaksi, layanan, dokter, dan laporan.
- Tambah transaksi, layanan, dan dokter memakai Server Actions.
- Database PostgreSQL menggunakan Neon Tech melalui Prisma ORM.

## Cara Menjalankan

```bash
npm install
cp .env.example .env
```

Isi `DATABASE_URL` di `.env` dengan connection string Neon Anda.

Lalu jalankan:

```bash
npm run db:setup
npm run dev
```

Buka:

```txt
http://localhost:3000
```

## Perintah Berguna

```bash
npm run prisma:push
npm run prisma:seed
npm run studio
```
