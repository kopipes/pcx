import NextAuth from "next-auth";
import { UserRole } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      businessUnitId: string | null;
    };
  }
  interface User {
    role: UserRole;
    businessUnitId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    businessUnitId: string | null;
  }
}
