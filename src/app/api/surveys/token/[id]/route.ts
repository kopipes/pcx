import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { surveys, responses, followUps, surveyQuestions, surveyRecipients } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { hashToken, generateId } from "@/lib/server-utils";
import { isRiskResponse } from "@/lib/utils";

// GET /api/surveys/token/[id] - validate token (survey-level OR recipient-level)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: token } = await params;
  const tHash = hashToken(token);

  // First check recipient token
  const recipient = await db
    .select()
    .from(surveyRecipients)
    .where(eq(surveyRecipients.tokenHash, tHash))
    .get();

  let surveyId: string;
  let recipientId: string | null = null;

  if (recipient) {
    surveyId = recipient.surveyId;
    recipientId = recipient.id;
    if (recipient.status === "COMPLETED") return NextResponse.json({ error: "Already completed" }, { status: 410 });
  } else {
    // Fall back to survey-level token
    const survey = await db.select().from(surveys).where(eq(surveys.tokenHash, tHash)).get();
    if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    if (survey.status === "COMPLETED") return NextResponse.json({ error: "Already completed" }, { status: 410 });
    if (survey.status === "DRAFT") return NextResponse.json({ error: "Survey not yet active" }, { status: 410 });
    if (survey.expiresAt < new Date()) return NextResponse.json({ error: "Survey expired" }, { status: 410 });
    surveyId = survey.id;
  }

  const survey = await db.select().from(surveys).where(eq(surveys.id, surveyId)).get();
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (survey.status === "DRAFT") return NextResponse.json({ error: "Survey not yet active" }, { status: 410 });
  if (survey.expiresAt < new Date()) return NextResponse.json({ error: "Survey expired" }, { status: 410 });

  const questions = (await db
    .select()
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, surveyId))
    .all())
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return NextResponse.json({
    surveyId,
    recipientId,
    recipientName: recipient?.name || null,
    questions,
  });
}

// POST /api/surveys/token/[id] - submit response
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: token } = await params;
  const tHash = hashToken(token);

  // Check recipient token first
  const recipient = await db
    .select()
    .from(surveyRecipients)
    .where(eq(surveyRecipients.tokenHash, tHash))
    .get();

  let surveyId: string;
  let recipientId: string | null = null;

  if (recipient) {
    surveyId = recipient.surveyId;
    recipientId = recipient.id;
    if (recipient.status === "COMPLETED") return NextResponse.json({ error: "Already completed" }, { status: 410 });
  } else {
    const survey = await db.select().from(surveys).where(eq(surveys.tokenHash, tHash)).get();
    if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    if (survey.status === "COMPLETED") return NextResponse.json({ error: "Already completed" }, { status: 410 });
    if (survey.status === "DRAFT") return NextResponse.json({ error: "Survey not yet active" }, { status: 410 });
    if (survey.expiresAt < new Date()) return NextResponse.json({ error: "Survey expired" }, { status: 410 });
    surveyId = survey.id;
  }

  const survey = await db.select().from(surveys).where(eq(surveys.id, surveyId)).get();
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (survey.expiresAt < new Date()) return NextResponse.json({ error: "Survey expired" }, { status: 410 });

  const body = await req.json();
  const { answers, respondentName, respondentEmail } = body;

  const questions = (await db
    .select()
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, surveyId))
    .all())
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let scoreOverall: number | null = null;
  let nps: number | null = null;

  questions.forEach((q, i) => {
    const val = answers?.[String(i)];
    if (!val) return;
    if (q.type === "rating") scoreOverall = scoreOverall === null ? Number(val) : Math.min(scoreOverall, Number(val));
    if (q.type === "nps") nps = Number(val);
  });

  const followUpStatus = isRiskResponse({ scoreOverall, nps }) ? "NEEDS_FOLLOWUP" : "NONE";

  // Use recipient name/email if available and not overridden
  const finalName = respondentName || recipient?.name || null;
  const finalEmail = respondentEmail || recipient?.email || null;

  const response = await db
    .insert(responses)
    .values({
      id: generateId(),
      surveyId,
      scoreOverall,
      scoreTimeliness: null,
      scoreCreativity: null,
      scoreCommunication: null,
      scoreProfessionalism: null,
      nps,
      improvementArea: null,
      comments: null,
      answers: answers ? JSON.stringify(answers) : null,
      followUpStatus,
      respondentName: finalName,
      respondentEmail: finalEmail,
      submittedAt: new Date(),
    })
    .returning()
    .get();

  if (followUpStatus === "NEEDS_FOLLOWUP") {
    await db.insert(followUps).values({
      id: generateId(),
      responseId: response.id,
      status: "OPEN",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Mark recipient as completed
  if (recipientId) {
    await db.update(surveyRecipients)
      .set({ status: "COMPLETED", submittedAt: new Date() })
      .where(eq(surveyRecipients.id, recipientId));
  }

  // Mark survey as COMPLETED only if no recipients or all recipients done
  const allRecipients = await db.select().from(surveyRecipients).where(eq(surveyRecipients.surveyId, surveyId)).all();
  if (allRecipients.length === 0) {
    // No recipients mode — mark whole survey done
    await db.update(surveys).set({ status: "COMPLETED" }).where(eq(surveys.id, surveyId));
  } else {
    // Multi-recipient: mark COMPLETED only if all done
    const pendingCount = allRecipients.filter(r => r.status !== "COMPLETED").length - (recipientId ? 1 : 0);
    if (pendingCount <= 0) {
      await db.update(surveys).set({ status: "COMPLETED" }).where(eq(surveys.id, surveyId));
    }
  }

  return NextResponse.json({ success: true });
}
