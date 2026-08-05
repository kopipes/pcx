import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { followUps, responses, surveys, projects, users, businessUnits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateId } from "@/lib/server-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;
  const buId = session.user.businessUnitId;

  let query = db
    .select({
      id: followUps.id,
      responseId: followUps.responseId,
      ownerId: followUps.ownerId,
      ownerName: users.name,
      actionNotes: followUps.actionNotes,
      status: followUps.status,
      resolvedAt: followUps.resolvedAt,
      createdAt: followUps.createdAt,
      updatedAt: followUps.updatedAt,
      scoreOverall: responses.scoreOverall,
      nps: responses.nps,
      respondentName: responses.respondentName,
      comments: responses.comments,
      submittedAt: responses.submittedAt,
      projectName: projects.projectName,
      clientCompany: projects.clientCompany,
      businessUnitId: projects.businessUnitId,
    })
    .from(followUps)
    .leftJoin(responses, eq(followUps.responseId, responses.id))
    .leftJoin(surveys, eq(responses.surveyId, surveys.id))
    .leftJoin(projects, eq(surveys.projectId, projects.id))
    .leftJoin(users, eq(followUps.ownerId, users.id));

  let all;
  if (role === "PM") {
    // PM only sees follow-ups assigned to them
    all = await query.where(eq(followUps.ownerId, userId)).all();
  } else if (role === "BU_HEAD" && buId) {
    // BU Head only sees follow-ups in their BU
    all = await query.where(eq(projects.businessUnitId, buId)).all();
  } else {
    // CS, ADMIN, DIRECTOR see all
    all = await query.all();
  }

  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { responseId, ownerId, actionNotes } = body;

  const followUp = await db
    .insert(followUps)
    .values({
      id: generateId(),
      responseId,
      ownerId,
      actionNotes,
      status: "OPEN",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
    .get();

  return NextResponse.json(followUp);
}
