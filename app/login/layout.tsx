import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - MediCare Pro",
  description: "Masuk ke Sistem Manajemen Klinik & Rumah Sakit MediCare Pro",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
