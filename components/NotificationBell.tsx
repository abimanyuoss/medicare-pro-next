"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import type { AdminNotification } from "@/lib/admin-notifications";

function toneClass(tone: AdminNotification["tone"]) {
  if (tone === "red") return "bg-red-500";
  if (tone === "amber") return "bg-amber-500";
  return "bg-blue-500";
}

export default function NotificationBell({
  notifications,
}: {
  notifications: AdminNotification[];
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-100"
        aria-label="Buka notifikasi"
        aria-expanded={open}
      >
        <Bell size={19} />
        {notifications.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-extrabold text-slate-900">Notifikasi</p>
            <p className="text-xs text-slate-500">
              Ringkasan hal yang perlu diperhatikan.
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl px-3 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Tidak ada notifikasi penting
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Semua ringkasan operasional terlihat aman.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 hover:bg-slate-50"
                >
                  <div className="flex gap-3">
                    <span
                      className={clsx(
                        "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                        toneClass(notification.tone)
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {notification.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
