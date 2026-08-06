import { auth } from "@/lib/auth";
import { UserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const roles = session.user.roles || [session.user.role];
  // ADMIN bypasses all role restrictions
  if (allowedRoles && !roles.includes("ADMIN") && !allowedRoles.some(r => roles.includes(r))) {
    redirect("/dashboard");
  }
  return session;
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "CS": return "/dashboard/cs";
    case "PM": return "/dashboard/pm";
    case "BU_HEAD": return "/dashboard/bu";
    case "DIRECTOR": return "/dashboard/director";
    case "ADMIN": return "/dashboard/admin";
    default: return "/dashboard";
  }
}
