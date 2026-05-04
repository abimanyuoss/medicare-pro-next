"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Pill,
  Stethoscope,
  TestTube2,
  Users
} from "lucide-react";
import clsx from "clsx";
import { logout } from "@/app/actions";

const menus = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Pendapatan", href: "/pendapatan", icon: BarChart3 },
  { title: "Kunjungan", href: "/kunjungan", icon: Users },
  { title: "Transaksi", href: "/transaksi", icon: ClipboardList },
  { title: "Layanan", href: "/layanan", icon: TestTube2 },
  { title: "Obat", href: "/obat", icon: Pill },
  { title: "Dokter", href: "/dokter", icon: Stethoscope },
  { title: "Laporan", href: "/laporan", icon: FileText }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white shadow-sm lg:sticky lg:top-0 lg:flex lg:flex-col">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-200">
          <Activity size={26} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold leading-tight text-slate-900">MediCare Pro</h1>
          <p className="text-sm text-slate-500">Klinik & RS</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-4 py-5">
        <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Menu Utama
        </p>
        {menus.map((menu) => {
          const Icon = menu.icon;
          const active = pathname === menu.href;

          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all",
                active
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon size={20} />
              {menu.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-5">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-800">Admin Klinik</p>
            <p className="truncate text-xs text-slate-500">admin@medicare.id</p>
          </div>
          <form action={logout}>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Logout"
              id="sidebar-logout-btn"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
