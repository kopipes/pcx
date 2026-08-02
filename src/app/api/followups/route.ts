import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { followUps, responses, surveys, projects, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateId } from "@/lib/server-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db
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
    })
    .from(followUps)
    .leftJoin(responses, eq(followUps.responseId, responses.id))
    .leftJoin(surveys, eq(responses.surveyId, surveys.id))
    .leftJoin(projects, eq(surveys.projectId, projects.id))
    .leftJoin(users, eq(followUps.ownerId, users.id))
    .all();

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
