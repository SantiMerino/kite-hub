import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import AdminScrollLock from "@/components/layout/AdminScrollLock";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/admin/login?returnTo=/admin/dashboard");
  }

  if (!["staff", "admin"].includes(user.role)) {
    redirect("/kiosk");
  }

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-background">
      <AdminScrollLock />
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 sm:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
