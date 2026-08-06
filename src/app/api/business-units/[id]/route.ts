import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businessUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.includes("ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { name, code } = body;

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (code) updateData.code = code.toUpperCase();

  const updated = await db.update(businessUnits).set(updateData).where(eq(businessUnits.id, id)).returning().get();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.includes("ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    await db.delete(businessUnits).where(eq(businessUnits.id, id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("FOREIGN KEY")) {
      return NextResponse.json(
        { error: "Business Unit tidak dapat dihapus karena masih memiliki proyek atau user yang terhubung. Hapus atau pindahkan data tersebut terlebih dahulu." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Gagal menghapus Business Unit." }, { status: 500 });
  }
}
