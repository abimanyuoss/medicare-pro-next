"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  DollarSign,
  Users,
  ClipboardList,
  TestTube2,
  Pill,
  Stethoscope,
  FileText,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/actions";
import NotificationBell from "@/components/NotificationBell";
import type { AdminNotification } from "@/lib/admin-notifications";

const menus = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Pendapatan",
    href: "/pendapatan",
    icon: DollarSign,
  },
  {
    title: "Kunjungan",
    href: "/kunjungan",
    icon: Users,
  },
  {
    title: "Transaksi",
    href: "/transaksi",
    icon: ClipboardList,
  },
  {
    title: "Layanan",
    href: "/layanan",
    icon: TestTube2,
  },
  {
    title: "Obat",
    href: "/obat",
    icon: Pill,
  },
  {
    title: "Dokter",
    href: "/dokter",
    icon: Stethoscope,
  },
  {
    title: "Laporan",
    href: "/laporan",
    icon: FileText,
  },
];

export default function MobileNav({
  notifications = [],
}: {
  notifications?: AdminNotification[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Topbar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 shadow-sm lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-md">
            <Activity size={24} />
          </div>

          <div>
            <h1 className="text-lg font-extrabold leading-tight text-slate-900">
              MediCare Pro
            </h1>
            <p className="text-xs font-medium text-slate-500">Klinik & RS</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell notifications={notifications} />

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[999] lg:hidden">
          {/* Backdrop gelap */}
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Sidebar mobile solid */}
          <aside className="absolute left-0 top-0 z-[1000] flex h-dvh w-[82%] max-w-sm flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-md">
                  <Activity size={26} />
                </div>

                <div>
                  <h2 className="text-xl font-extrabold leading-tight text-slate-900">
                    MediCare Pro
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Klinik & RS
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto bg-white px-4 py-5">
              <div className="mb-3 px-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Menu Utama
                </p>
              </div>

              <div className="space-y-2">
                {menus.map((menu) => {
                  const Icon = menu.icon;
                  const active = pathname === menu.href;

                  return (
                    <Link
                      key={menu.href}
                      href={menu.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-bold transition ${
                        active
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={22} />
                      <span>{menu.title}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700">
                  A
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-800">
                    Admin Klinik
                  </p>
                  <p className="truncate text-xs font-medium text-slate-500">
                    admin@medicare.id
                  </p>
                </div>

                <form action={logout}>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
