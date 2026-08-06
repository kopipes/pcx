import NextAuth from "next-auth";
import { UserRole } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;        // primary role
      roles: UserRole[];     // all assigned roles
      businessUnitId: string | null;
    };
  }
  interface User {
    role: UserRole;
    roles: UserRole[];
    businessUnitId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    roles: UserRole[];
    businessUnitId: string | null;
  }
}
