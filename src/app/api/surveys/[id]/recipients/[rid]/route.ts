import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { surveyRecipients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

// DELETE /api/surveys/[id]/recipients/[rid]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["CS", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, rid } = await params;

  const recipient = await db
    .select()
    .from(surveyRecipients)
    .where(and(eq(surveyRecipients.id, rid), eq(surveyRecipients.surveyId, id)))
    .get();

  if (!recipient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (recipient.status === "COMPLETED") {
    return NextResponse.json({ error: "Tidak bisa menghapus penerima yang sudah mengisi" }, { status: 400 });
  }

  await db.delete(surveyRecipients).where(eq(surveyRecipients.id, rid));
  return NextResponse.json({ success: true });
}
