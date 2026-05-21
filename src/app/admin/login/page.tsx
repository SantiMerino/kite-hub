import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import AdminLoginForm from "@/components/auth/AdminLoginForm";

function safeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith("/admin") || value.includes("://")) {
    return "/admin/dashboard";
  }
  return value;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  const user = await getAuthUser();

  if (user && ["staff", "admin"].includes(user.role)) {
    redirect(returnTo);
  }

  return <AdminLoginForm returnTo={returnTo} />;
}
