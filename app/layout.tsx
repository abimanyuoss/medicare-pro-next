import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import MobileNav from "@/components/MobileNav";
import FlashToast from "@/components/FlashToast";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { getAdminNotifications } from "@/lib/admin-notifications";

export const metadata: Metadata = {
  title: "MediCare Pro",
  description: "Sistem Manajemen Klinik & Rumah Sakit",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const isAuthenticated = await verifySessionToken(
    cookieStore.get(getSessionCookieName())?.value
  );
  const notifications = isAuthenticated ? await getAdminNotifications() : [];

  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900">
        {isAuthenticated ? (
          <div className="flex min-h-screen">
            <Sidebar />

            <main className="min-w-0 flex-1">
              <MobileNav notifications={notifications} />

              <div className="hidden lg:block">
                <Topbar notifications={notifications} />
              </div>

              <div className="p-4 sm:p-6 lg:p-8">{children}</div>
              <FlashToast />
            </main>
          </div>
        ) : (
          <>{children}</>
        )}
      </body>
    </html>
  );
}
