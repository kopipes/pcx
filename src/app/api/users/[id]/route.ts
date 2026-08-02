import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, email, role, businessUnitId, password } = body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (role) updateData.role = role;
  if (businessUnitId !== undefined) updateData.businessUnitId = businessUnitId || null;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

  const updated = await db.update(users).set(updateData).where(eq(users.id, id)).returning().get();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { passwordHash: _, ...safe } = updated;
  return NextResponse.json(safe);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Prevent self-deletion
  if (id === session.user.id) return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
