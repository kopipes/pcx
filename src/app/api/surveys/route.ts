import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { surveys, projects, surveyQuestions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateId, generateToken, hashToken } from "@/lib/server-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const roles = session.user.roles || [role];
  const buId = session.user.businessUnitId;

  const baseQuery = db
    .select({
      id: surveys.id,
      status: surveys.status,
      notes: surveys.notes,
      expiresAt: surveys.expiresAt,
      sentAt: surveys.sentAt,
      createdAt: surveys.createdAt,
      projectId: surveys.projectId,
      projectName: projects.projectName,
      clientCompany: projects.clientCompany,
      businessUnitId: projects.businessUnitId,
      questionCount: sql<number>`(SELECT COUNT(*) FROM survey_questions WHERE survey_id = ${surveys.id})`,
    })
    .from(surveys)
    .leftJoin(projects, eq(surveys.projectId, projects.id));

  // BU_HEAD and CS only see surveys in their BU; others see all
  const allSurveys = (role === "BU_HEAD" || role === "CS") && buId
    ? await baseQuery.where(eq(projects.businessUnitId, buId)).all()
    : await baseQuery.all();

  return NextResponse.json(allSurveys);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.some(r => ["CS","ADMIN"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { projectId, expiresInDays = 7, notes, asDraft = true, allowMultiple = false } = body;

  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  try {
    const survey = await db
      .insert(surveys)
      .values({
        id: generateId(),
        projectId,
        token,
        tokenHash,
        expiresAt,
        status: asDraft ? "DRAFT" : "SENT",
        allowMultiple,
        notes: notes || null,
        createdBy: session.user.id,
        createdAt: new Date(),
      })
      .returning()
      .get();

    return NextResponse.json({ ...survey, token });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("FOREIGN KEY")) {
      return NextResponse.json({ error: "Sesi Anda kedaluwarsa setelah database direset. Silakan logout dan login kembali." }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
