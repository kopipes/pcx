import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.some(r => ["CS","ADMIN"].includes(r))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { clientCompany, projectName, businessUnitId, projectManagerId } = body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (clientCompany) updateData.clientCompany = clientCompany;
  if (projectName) updateData.projectName = projectName;
  if (businessUnitId) updateData.businessUnitId = businessUnitId;
  if (projectManagerId !== undefined) updateData.projectManagerId = projectManagerId || null;

  const updated = await db.update(projects).set(updateData).where(eq(projects.id, id)).returning().get();
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
    await db.delete(projects).where(eq(projects.id, id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("FOREIGN KEY")) {
      return NextResponse.json({ error: "Proyek tidak dapat dihapus karena masih memiliki survei yang terhubung." }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal menghapus proyek." }, { status: 500 });
  }
}
