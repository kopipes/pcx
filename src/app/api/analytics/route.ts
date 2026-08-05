import { NextResponse } from "next/server";
import { db } from "@/db";
import { responses, surveys, projects, businessUnits, followUps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { calculateNpsScore, calculateCsat } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const buId = session.user.businessUnitId;

  let query = db
    .select({
      scoreOverall: responses.scoreOverall,
      scoreTimeliness: responses.scoreTimeliness,
      scoreCreativity: responses.scoreCreativity,
      scoreCommunication: responses.scoreCommunication,
      scoreProfessionalism: responses.scoreProfessionalism,
      nps: responses.nps,
      followUpStatus: responses.followUpStatus,
      submittedAt: responses.submittedAt,
      businessUnitId: projects.businessUnitId,
      businessUnitName: businessUnits.name,
    })
    .from(responses)
    .leftJoin(surveys, eq(responses.surveyId, surveys.id))
    .leftJoin(projects, eq(surveys.projectId, projects.id))
    .leftJoin(businessUnits, eq(projects.businessUnitId, businessUnits.id));

  // BU_HEAD only sees their own BU
  const allResponses = role === "BU_HEAD" && buId
    ? (await query.where(eq(projects.businessUnitId, buId)).all())
    : (await query.all());

  const totalResponses = allResponses.length;
  const npsScore = calculateNpsScore(allResponses);
  const csat = calculateCsat(allResponses);
  const riskCount = allResponses.filter(
    (r) => (r.scoreOverall !== null && r.scoreOverall <= 2) || (r.nps !== null && r.nps <= 6)
  ).length;

  // Per BU aggregation
  const buMap: Record<string, { name: string; responses: typeof allResponses }> = {};
  for (const r of allResponses) {
    const key = r.businessUnitId || "unknown";
    if (!buMap[key]) buMap[key] = { name: r.businessUnitName || "Unknown", responses: [] };
    buMap[key].responses.push(r);
  }

  const buStats = Object.entries(buMap).map(([id, data]) => ({
    id,
    name: data.name,
    totalResponses: data.responses.length,
    nps: calculateNpsScore(data.responses),
    csat: calculateCsat(data.responses),
    avgOverall: data.responses.filter(r => r.scoreOverall !== null).length > 0
      ? data.responses.reduce((s, r) => s + (r.scoreOverall || 0), 0) / data.responses.filter(r => r.scoreOverall !== null).length
      : 0,
  }));

  // Follow-up SLA — scoped to BU if BU_HEAD
  let allFollowUpsQuery = db
    .select({ createdAt: followUps.createdAt, resolvedAt: followUps.resolvedAt })
    .from(followUps)
    .leftJoin(responses, eq(followUps.responseId, responses.id))
    .leftJoin(surveys, eq(responses.surveyId, surveys.id))
    .leftJoin(projects, eq(surveys.projectId, projects.id));

  const scopedFollowUps = role === "BU_HEAD" && buId
    ? await allFollowUpsQuery.where(eq(projects.businessUnitId, buId)).all()
    : await allFollowUpsQuery.all();

  const resolvedInSla = scopedFollowUps.filter((f) => {
    if (!f.resolvedAt) return false;
    const slaDeadline = new Date(f.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    return f.resolvedAt <= slaDeadline;
  }).length;
  const slaPct = scopedFollowUps.length > 0 ? Math.round((resolvedInSla / scopedFollowUps.length) * 100) : 100;

  return NextResponse.json({
    totalResponses,
    npsScore,
    csat,
    riskCount,
    slaPct,
    buStats,
  });
}
