import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/db";
import { surveys, surveyRecipients, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXTAUTH_URL?.replace("http://localhost:3000", "https://pcx.provaliantgroup.com") || "https://pcx.provaliantgroup.com";

// POST /api/surveys/[id]/send-email
// Body: { recipientId?: string } — if omitted, sends to all pending recipients
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.some(r => ["CS", "ADMIN"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { recipientId } = body;

  // Load survey + project
  const survey = await db
    .select({
      id: surveys.id,
      status: surveys.status,
      projectName: projects.projectName,
      clientCompany: projects.clientCompany,
    })
    .from(surveys)
    .leftJoin(projects, eq(surveys.projectId, projects.id))
    .where(eq(surveys.id, id))
    .get();

  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (survey.status !== "SENT") return NextResponse.json({ error: "Survey must be active (SENT) to send emails" }, { status: 400 });

  // Load recipients
  const allRecipients = await db
    .select()
    .from(surveyRecipients)
    .where(eq(surveyRecipients.surveyId, id))
    .all();

  const targets = recipientId
    ? allRecipients.filter(r => r.id === recipientId)
    : allRecipients.filter(r => r.email && r.status !== "COMPLETED");

  if (!targets.length) {
    return NextResponse.json({ error: "No eligible recipients with email found" }, { status: 400 });
  }

  const results: { id: string; name: string | null; email: string | null; success: boolean; error?: string }[] = [];

  for (const recipient of targets) {
    if (!recipient.email) {
      results.push({ id: recipient.id, name: recipient.name, email: null, success: false, error: "No email address" });
      continue;
    }

    const surveyLink = `${BASE_URL}/survey/${recipient.token}`;
    const companyLine = recipient.company ? ` dari <strong>${recipient.company}</strong>` : "";

    try {
      await resend.emails.send({
        from: "Provaliant Client Experience <no-reply@provaliantgroup.com>",
        to: recipient.email,
        subject: `Undangan Survei Kepuasan Klien — ${survey.clientCompany}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 32px 16px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #4f46e5; padding: 32px; text-align: center;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 14px; font-size: 24px; font-weight: bold; color: white; margin-bottom: 12px;">P</div>
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">Survei Kepuasan Klien</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Provaliant Client Experience</p>
    </div>
    <div style="padding: 32px; color: #374151; line-height: 1.7; font-size: 15px;">
      <p>Yth. Bapak/Ibu <strong>${recipient.name}</strong>${companyLine},</p>
      <p>Terima kasih atas kepercayaan Anda dalam menggunakan layanan <strong>Provaliant</strong> untuk proyek <strong>${survey.projectName}</strong>.</p>
      <p>Kami ingin mendapatkan masukan dan penilaian Anda mengenai kualitas layanan yang telah kami berikan. Penilaian Anda sangat berharga bagi kami untuk terus meningkatkan standar layanan.</p>
      <p>Silakan klik tombol di bawah ini untuk mengisi survei. Proses pengisian hanya membutuhkan waktu <strong>2–3 menit</strong>.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${surveyLink}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">Isi Survei Sekarang →</a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 12px;">Link bersifat personal dan hanya dapat digunakan oleh Anda</p>
      </div>
      <p>Jika tombol di atas tidak berfungsi, salin dan tempel link berikut di browser Anda:</p>
      <p style="word-break: break-all; color: #6b7280; font-size: 12px; background: #f3f4f6; padding: 10px 14px; border-radius: 8px;">${surveyLink}</p>
      <p style="margin-top: 32px;">Hormat kami,<br><strong>Tim Provaliant Client Experience</strong></p>
    </div>
    <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Data Anda terlindungi dan hanya digunakan untuk meningkatkan kualitas layanan Provaliant.</p>
    </div>
  </div>
</body>
</html>`,
      });
      results.push({ id: recipient.id, name: recipient.name, email: recipient.email, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({ id: recipient.id, name: recipient.name, email: recipient.email, success: false, error: message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return NextResponse.json({ results, successCount, failCount });
}
