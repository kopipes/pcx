import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateId } from "@/lib/server-utils";

// GET /api/users/[id]/roles
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionRoles = session.user.roles || [session.user.role];
  if (!sessionRoles.includes("ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userRoleList = await db.select().from(userRoles).where(eq(userRoles.userId, id)).all();
  return NextResponse.json(userRoleList);
}

// POST /api/users/[id]/roles — set all roles for a user (replaces existing)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionRoles = session.user.roles || [session.user.role];
  if (!sessionRoles.includes("ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { roles } = body; // array of role strings

  if (!Array.isArray(roles)) return NextResponse.json({ error: "roles must be an array" }, { status: 400 });

  // Delete all existing additional roles for this user
  await db.delete(userRoles).where(eq(userRoles.userId, id));

  // Insert new roles
  if (roles.length > 0) {
    await Promise.all(
      roles.map((role: string) =>
        db.insert(userRoles).values({
          id: generateId(),
          userId: id,
          role: role as "CS" | "PM" | "BU_HEAD" | "DIRECTOR" | "ADMIN",
          createdAt: new Date(),
        }).run()
      )
    );
  }

  const saved = await db.select().from(userRoles).where(eq(userRoles.userId, id)).all();
  return NextResponse.json(saved);
}
