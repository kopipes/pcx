import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { surveyQuestions, surveys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateId } from "@/lib/server-utils";

// GET /api/surveys/[id]/questions
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];

  const { id } = await params;
  const questions = await db
    .select()
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, id))
    .all();

  return NextResponse.json(questions.sort((a, b) => a.sortOrder - b.sortOrder));
}

// POST /api/surveys/[id]/questions — save questions for a DRAFT survey
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.some(r => ["CS","ADMIN"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const survey = await db.select().from(surveys).where(eq(surveys.id, id)).get();
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (survey.status !== "DRAFT") return NextResponse.json({ error: "Only DRAFT surveys can be edited" }, { status: 400 });

  const body = await req.json();
  const { questions } = body;

  if (!questions?.length) return NextResponse.json({ error: "questions required" }, { status: 400 });

  // Delete existing questions for this survey
  await db.delete(surveyQuestions).where(eq(surveyQuestions.surveyId, id));

  // Insert new questions
  const saved = await Promise.all(
    questions.map((q: { type: "rating" | "nps" | "text" | "select" | "multiselect"; label: string; required: boolean; options?: string }, i: number) =>
      db.insert(surveyQuestions).values({
        id: generateId(),
        surveyId: id,
        templateId: null,
        sortOrder: i,
        type: q.type,
        label: q.label,
        required: q.required ?? true,
        options: q.options || null,
        createdAt: new Date(),
      }).returning().get()
    )
  );

  return NextResponse.json(saved);
}
