import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { surveys, responses, projects, businessUnits, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

// GET /api/surveys/[id]/detail - full survey detail with responses
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const survey = await db
    .select({
      id: surveys.id,
      token: surveys.token,
      status: surveys.status,
      notes: surveys.notes,
      expiresAt: surveys.expiresAt,
      sentAt: surveys.sentAt,
      createdAt: surveys.createdAt,
      projectId: surveys.projectId,
      projectName: projects.projectName,
      clientCompany: projects.clientCompany,
      businessUnitName: businessUnits.name,
      projectManagerName: users.name,
    })
    .from(surveys)
    .leftJoin(projects, eq(surveys.projectId, projects.id))
    .leftJoin(businessUnits, eq(projects.businessUnitId, businessUnits.id))
    .leftJoin(users, eq(projects.projectManagerId, users.id))
    .where(eq(surveys.id, id))
    .get();

  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const surveyResponses = await db
    .select()
    .from(responses)
    .where(eq(responses.surveyId, id))
    .all();

  return NextResponse.json({ ...survey, responses: surveyResponses });
}

// PATCH /api/surveys/[id]/detail - edit draft or mark as sent
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["CS", "ADMIN"].includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { projectId, expiresInDays, notes, action, allowMultiple } = body;

  const survey = await db.select().from(surveys).where(eq(surveys.id, id)).get();
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  // DRAFT-only edits
  if (survey.status === "DRAFT") {
    if (projectId) updateData.projectId = projectId;
    if (notes !== undefined) updateData.notes = notes;
    if (allowMultiple !== undefined) updateData.allowMultiple = allowMultiple;
    if (expiresInDays) updateData.expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    if (action === "send") {
      updateData.status = "SENT";
      updateData.sentAt = new Date();
    }
  }

  // SENT-allowed actions
  if (survey.status === "SENT") {
    if (action === "close") {
      updateData.status = "EXPIRED";
      updateData.expiresAt = new Date();
    }
    if (action === "extend" && expiresInDays) {
      updateData.expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    }
    if (notes !== undefined) updateData.notes = notes;
    // Allow toggling allowMultiple on SENT surveys too
    if (allowMultiple !== undefined) updateData.allowMultiple = allowMultiple;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan yang dapat dilakukan" }, { status: 400 });
  }

  const updated = await db.update(surveys).set(updateData).where(eq(surveys.id, id)).returning().get();
  return NextResponse.json(updated);
}
