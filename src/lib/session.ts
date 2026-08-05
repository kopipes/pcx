import { auth } from "@/lib/auth";
import { UserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // ADMIN bypasses all role restrictions
  if (allowedRoles && session.user.role !== "ADMIN" && !allowedRoles.includes(session.user.role as UserRole)) {
    redirect("/dashboard");
  }
  return session;
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "PM": return "/dashboard/pm";
    case "BU_HEAD": return "/dashboard/bu";
    case "DIRECTOR": return "/dashboard/director";
    case "ADMIN": return "/dashboard/admin";
    default: return "/dashboard";
  }
}
