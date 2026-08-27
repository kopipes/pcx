import { NextResponse } from "next/server";
import { db } from "@/db";
import { responses, surveys, projects, businessUnits, surveyQuestions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = session.user.roles || [session.user.role];
  if (!roles.some(r => ["BU_HEAD", "DIRECTOR", "ADMIN"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buIds = session.user.businessUnitIds || (session.user.businessUnitId ? [session.user.businessUnitId] : []);
  const isScoped = roles.includes("BU_HEAD") && !roles.includes("DIRECTOR") && !roles.includes("ADMIN");

  // Fetch all surveys with project/BU info
  const allSurveys = await db
    .select({
      id: surveys.id,
      status: surveys.status,
      projectId: surveys.projectId,
      projectName: projects.projectName,
      clientCompany: projects.clientCompany,
      businessUnitId: projects.businessUnitId,
      businessUnitName: businessUnits.name,
      createdAt: surveys.createdAt,
    })
    .from(surveys)
    .leftJoin(projects, eq(surveys.projectId, projects.id))
    .leftJoin(businessUnits, eq(projects.businessUnitId, businessUnits.id))
    .all();

  const scopedSurveys = isScoped
    ? allSurveys.filter(s => buIds.includes(s.businessUnitId ?? ""))
    : allSurveys;

  // Only surveys with responses
  const surveyIds = scopedSurveys.map(s => s.id);
  if (!surveyIds.length) return NextResponse.json([]);

  // Fetch all responses for these surveys
  const allResponses = await db
    .select({
      id: responses.id,
      surveyId: responses.surveyId,
      answers: responses.answers,
    })
    .from(responses)
    .all();

  const scopedResponses = allResponses.filter(r => surveyIds.includes(r.surveyId ?? ""));

  // Fetch all questions for these surveys
  const allQuestions = await db
    .select()
    .from(surveyQuestions)
    .all();

  // Build result per survey
  const result = await Promise.all(
    scopedSurveys.map(async (survey) => {
      const surveyResponses = scopedResponses.filter(r => r.surveyId === survey.id);
      const questions = allQuestions
        .filter(q => q.surveyId === survey.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      // Only include rating, nps, select questions
      const scoredQuestions = questions.filter(q =>
        q.type === "rating" || q.type === "nps" || q.type === "select"
      );

      const questionStats = scoredQuestions.map((q, _) => {
        // Find index of this question among ALL questions (for answers key lookup)
        const qIdx = questions.findIndex(x => x.id === q.id);

        const answered = surveyResponses
          .map(r => {
            try {
              const parsed = r.answers ? JSON.parse(r.answers) : {};
              return parsed[String(qIdx)];
            } catch {
              return undefined;
            }
          })
          .filter(v => v !== undefined && v !== "" && v !== null);

        if (q.type === "rating" || q.type === "nps") {
          const nums = answered.map(v => parseFloat(v)).filter(n => !isNaN(n));
          const avg = nums.length > 0
            ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
            : null;
          return {
            id: q.id,
            label: q.label,
            type: q.type,
            options: q.options,
            responseCount: nums.length,
            avg,
          };
        }

        if (q.type === "select") {
          const opts = q.options ? q.options.split(",").map(o => o.trim()).filter(Boolean) : [];
          const dist: Record<string, number> = {};
          for (const opt of opts) dist[opt] = 0;
          for (const v of answered) {
            if (dist[v] !== undefined) dist[v]++;
            else dist[v] = (dist[v] || 0) + 1;
          }
          const total = answered.length;
          const distribution = Object.entries(dist).map(([opt, count]) => ({
            opt,
            count,
            pct: total > 0 ? Math.round((count / total) * 100) : 0,
          }));
          return {
            id: q.id,
            label: q.label,
            type: q.type,
            options: q.options,
            responseCount: total,
            distribution,
          };
        }

        return null;
      }).filter(Boolean);

      return {
        surveyId: survey.id,
        projectName: survey.projectName,
        clientCompany: survey.clientCompany,
        businessUnitName: survey.businessUnitName,
        status: survey.status,
        totalResponses: surveyResponses.length,
        questions: questionStats,
      };
    })
  );

  // Only return surveys that have at least 1 response
  return NextResponse.json(result.filter(s => s.totalResponses > 0));
}
