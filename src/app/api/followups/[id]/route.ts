import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { followUps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, actionNotes, ownerId } = body;

  const updated = await db
    .update(followUps)
    .set({
      ...(status && { status }),
      ...(actionNotes !== undefined && { actionNotes }),
      ...(ownerId !== undefined && { ownerId }),
      ...(status === "RESOLVED" && { resolvedAt: new Date() }),
      updatedAt: new Date(),
    })
    .where(eq(followUps.id, id))
    .returning()
    .get();

  return NextResponse.json(updated);
}
