"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

type FlashMessage = {
  title: string;
  description?: string;
};

function readFlashCookie() {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("medicare_flash="));

  if (!cookie) return null;

  try {
    const value = cookie.split("=").slice(1).join("=");
    return JSON.parse(decodeURIComponent(value)) as FlashMessage;
  } catch {
    return null;
  }
}

function clearFlashCookie() {
  document.cookie = "medicare_flash=; path=/; max-age=0; SameSite=Lax";
}

function resetFlashForms() {
  document
    .querySelectorAll<HTMLFormElement>("form[data-reset-on-flash='true']")
    .forEach((form) => form.reset());

  window.dispatchEvent(new CustomEvent("medicare:flash-success"));
}

export default function FlashToast() {
  const [message, setMessage] = useState<FlashMessage | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const flash = readFlashCookie();
    if (!flash) return;

    setMessage(flash);
    clearFlashCookie();
    resetFlashForms();

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!message) return null;

  return (
    <div className="fixed right-4 top-4 z-[9999] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-emerald-200 bg-white p-4 text-slate-900 shadow-2xl shadow-slate-200/80">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">{message.title}</p>
          {message.description && (
            <p className="mt-1 text-sm leading-5 text-slate-500">
              {message.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMessage(null)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Tutup notifikasi"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
