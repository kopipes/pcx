import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { responses, surveys, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const buId = session.user.businessUnitId;

  const baseQuery = db
    .select({
      id: responses.id,
      surveyId: responses.surveyId,
      scoreOverall: responses.scoreOverall,
      scoreTimeliness: responses.scoreTimeliness,
      scoreCreativity: responses.scoreCreativity,
      scoreCommunication: responses.scoreCommunication,
      scoreProfessionalism: responses.scoreProfessionalism,
      nps: responses.nps,
      improvementArea: responses.improvementArea,
      comments: responses.comments,
      answers: responses.answers,
      followUpStatus: responses.followUpStatus,
      respondentName: responses.respondentName,
      respondentEmail: responses.respondentEmail,
      submittedAt: responses.submittedAt,
      projectName: projects.projectName,
      clientCompany: projects.clientCompany,
      businessUnitId: projects.businessUnitId,
    })
    .from(responses)
    .leftJoin(surveys, eq(responses.surveyId, surveys.id))
    .leftJoin(projects, eq(surveys.projectId, projects.id));

  // BU_HEAD only sees responses in their BU
  const allResponses = role === "BU_HEAD" && buId
    ? await baseQuery.where(eq(projects.businessUnitId, buId)).all()
    : await baseQuery.all();

  return NextResponse.json(allResponses);
}
