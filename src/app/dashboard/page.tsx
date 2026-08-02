import { auth } from "@/lib/auth";
import { getDashboardPath, requireAuth } from "@/lib/session";
import { UserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await requireAuth();
  redirect(getDashboardPath(session.user.role as UserRole));
}
