import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { surveyRecipients, surveys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateId, generateToken, hashToken } from "@/lib/server-utils";

// GET /api/surveys/[id]/recipients
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];

  const { id } = await params;
  const recipients = await db
    .select()
    .from(surveyRecipients)
    .where(eq(surveyRecipients.surveyId, id))
    .all();

  return NextResponse.json(recipients);
}

// POST /api/surveys/[id]/recipients — add one or multiple recipients
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.some(r => ["CS","ADMIN"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const survey = await db.select().from(surveys).where(eq(surveys.id, id)).get();
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (survey.status === "COMPLETED") return NextResponse.json({ error: "Survey sudah selesai" }, { status: 400 });

  const body = await req.json();
  // Accept array of {name, email} or single {name, email}
  const list: { name?: string; email?: string; company?: string }[] = Array.isArray(body) ? body : [body];

  const saved = await Promise.all(
    list.map(async (r) => {
      const token = generateToken();
      const tHash = hashToken(token);
      return db.insert(surveyRecipients).values({
        id: generateId(),
        surveyId: id,
        name: r.name || null,
        email: r.email || null,
        company: r.company || null,
        token,
        tokenHash: tHash,
        status: "PENDING",
        createdAt: new Date(),
      }).returning().get();
    })
  );

  return NextResponse.json(saved);
}
