import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users, userRoles, userBusinessUnits } from "@/db/schema";
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

        // Fetch additional BU assignments
        const additionalBUs = await db
          .select({ businessUnitId: userBusinessUnits.businessUnitId })
          .from(userBusinessUnits)
          .where(eq(userBusinessUnits.userId, user.id))
          .all();

        // Merge primary role + additional roles (deduplicated)
        const allRoles = Array.from(new Set([
          user.role as UserRole,
          ...additionalRoles.map(r => r.role as UserRole),
        ]));

        // Merge primary BU + additional BUs (deduplicated)
        const allBusinessUnitIds = Array.from(new Set([
          ...(user.businessUnitId ? [user.businessUnitId] : []),
          ...additionalBUs.map(b => b.businessUnitId),
        ]));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          roles: allRoles,
          businessUnitId: user.businessUnitId,
          businessUnitIds: allBusinessUnitIds,
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
        token.businessUnitIds = (user as { businessUnitIds: string[] }).businessUnitIds;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string;
        session.user.role = token.role as UserRole;
        session.user.roles = (token.roles as UserRole[]) || [token.role as UserRole];
        session.user.businessUnitId = token.businessUnitId as string | null;
        session.user.businessUnitIds = (token.businessUnitIds as string[]) || (token.businessUnitId ? [token.businessUnitId as string] : []);
      }
      return session;
    },
  },
});
