import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import MobileNav from "@/components/MobileNav";
import FlashToast from "@/components/FlashToast";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { getAdminNotifications } from "@/lib/admin-notifications";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const isAuthenticated = await verifySessionToken(
    cookieStore.get(getSessionCookieName())?.value
  );

  if (!isAuthenticated) {
    redirect("/login");
  }

  const notifications = await getAdminNotifications();

  return (
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
  );
}
