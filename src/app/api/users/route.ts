import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, businessUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateId } from "@/lib/server-utils";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  // All authenticated roles can read users list (needed for PM picker in BU/Admin pages)

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      businessUnitId: users.businessUnitId,
      businessUnitName: businessUnits.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(businessUnits, eq(users.businessUnitId, businessUnits.id))
    .all();

  return NextResponse.json(allUsers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.includes("ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, email, password, role, businessUnitId } = body;

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db
    .insert(users)
    .values({
      id: generateId(),
      name,
      email,
      passwordHash,
      role,
      businessUnitId: businessUnitId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
    .get();

  const { passwordHash: _, ...userWithoutPassword } = user;
  return NextResponse.json(userWithoutPassword);
}
