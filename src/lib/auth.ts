import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users, userRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export type UserRole = "CS" | "PM" | "BU_HEAD" | "DIRECTOR" | "ADMIN";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .get();

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordMatch) return null;

        // Fetch additional roles from user_roles table
        const additionalRoles = await db
          .select({ role: userRoles.role })
          .from(userRoles)
          .where(eq(userRoles.userId, user.id))
          .all();

        // Merge primary role + additional roles (deduplicated)
        const allRoles = Array.from(new Set([
          user.role as UserRole,
          ...additionalRoles.map(r => r.role as UserRole),
        ]));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,       // primary role
          roles: allRoles,       // all roles
          businessUnitId: user.businessUnitId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: UserRole }).role;
        token.roles = (user as { roles: UserRole[] }).roles;
        token.businessUnitId = (user as { businessUnitId: string | null }).businessUnitId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string;
        session.user.role = token.role as UserRole;
        session.user.roles = (token.roles as UserRole[]) || [token.role as UserRole];
        session.user.businessUnitId = token.businessUnitId as string | null;
      }
      return session;
    },
  },
});
