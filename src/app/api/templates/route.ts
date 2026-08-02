import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { surveyTemplates, surveyQuestions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateId } from "@/lib/server-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await db.select().from(surveyTemplates).all();

  const result = await Promise.all(
    templates.map(async (t) => {
      const questions = await db
        .select()
        .from(surveyQuestions)
        .where(eq(surveyQuestions.templateId, t.id))
        .all();
      return { ...t, questions };
    })
  );

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["CS", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, questions } = body;

  if (!name || !questions?.length) {
    return NextResponse.json({ error: "name and questions required" }, { status: 400 });
  }

  const template = await db
    .insert(surveyTemplates)
    .values({
      id: generateId(),
      name,
      description: description || null,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
    .get();

  const savedQuestions = await Promise.all(
    questions.map((q: { type: "rating" | "nps" | "text" | "select"; label: string; required: boolean; options?: string }, i: number) =>
      db.insert(surveyQuestions).values({
        id: generateId(),
        templateId: template.id,
        surveyId: null,
        sortOrder: i,
        type: q.type,
        label: q.label,
        required: q.required ?? true,
        options: q.options || null,
        createdAt: new Date(),
      }).returning().get()
    )
  );

  return NextResponse.json({ ...template, questions: savedQuestions });
}
