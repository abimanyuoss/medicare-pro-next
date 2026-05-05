import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediCare Pro",
  description: "Sistem Manajemen Klinik & Rumah Sakit",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
