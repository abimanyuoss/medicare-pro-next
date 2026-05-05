"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import type { AdminNotification } from "@/lib/admin-notifications";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Ringkasan data klinik hari ini" },
  "/pendapatan": { title: "Pendapatan", subtitle: "Analisis pendapatan klinik" },
  "/kunjungan": { title: "Kunjungan", subtitle: "Pantau tren kunjungan pasien" },
  "/transaksi": { title: "Transaksi", subtitle: "Kelola pembayaran dan layanan pasien" },
  "/layanan": { title: "Layanan", subtitle: "Kelola daftar layanan klinik" },
  "/dokter": { title: "Dokter", subtitle: "Kelola data dokter dan jadwal praktik" },
  "/laporan": { title: "Laporan", subtitle: "Rekap data untuk kebutuhan administrasi" }
};

function resolveTitle(pathname: string) {
  if (pathname.startsWith("/pasien/")) {
    return {
      title: "Riwayat Pasien",
      subtitle: "Riwayat kunjungan, obat, pembayaran, dan tagihan",
    };
  }

  return titles[pathname] ?? titles["/"];
}

export default function Topbar({
  notifications,
}: {
  notifications: AdminNotification[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = resolveTitle(pathname);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery(pathname === "/transaksi" ? searchParams.get("q") ?? "" : "");
  }, [pathname, searchParams]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      router.push(`/transaksi?q=${encodeURIComponent(trimmedQuery)}`);
      return;
    }

    router.push("/transaksi");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-slate-900 sm:text-xl">{current.title}</h2>
            <p className="hidden truncate text-sm text-slate-500 sm:block">{current.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari pasien, transaksi..."
              className="w-64 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </form>
          <NotificationBell notifications={notifications} />
          <Link
            href="/transaksi"
            className="hidden items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 sm:flex"
          >
            <Plus size={17} />
            Transaksi Baru
          </Link>
        </div>
      </div>
    </header>
  );
}
