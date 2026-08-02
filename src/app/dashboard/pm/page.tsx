import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { followUps, responses, surveys, projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function PMDashboard() {
  const session = await requireAuth(["PM", "ADMIN"]);

  const myFollowUps = await db
    .select({
      id: followUps.id,
      status: followUps.status,
      projectName: projects.projectName,
      clientCompany: projects.clientCompany,
    })
    .from(followUps)
    .leftJoin(responses, eq(followUps.responseId, responses.id))
    .leftJoin(surveys, eq(responses.surveyId, surveys.id))
    .leftJoin(projects, eq(surveys.projectId, projects.id))
    .where(eq(followUps.ownerId, session.user.id))
    .all();

  const open = myFollowUps.filter((f) => f.status === "OPEN").length;
  const inProgress = myFollowUps.filter((f) => f.status === "IN_PROGRESS").length;
  const resolved = myFollowUps.filter((f) => f.status === "RESOLVED").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Project Manager</h1>
      <p className="text-gray-500 text-sm mb-6">Ringkasan follow-up proyek yang Anda kelola</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-red-600">{open}</div>
          <div className="text-sm text-gray-500 mt-1">Follow-up Terbuka</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-yellow-600">{inProgress}</div>
          <div className="text-sm text-gray-500 mt-1">Sedang Ditangani</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-green-600">{resolved}</div>
          <div className="text-sm text-gray-500 mt-1">Diselesaikan</div>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
        <p className="text-indigo-700 text-sm font-medium">
          Kunjungi halaman <strong>Follow-up</strong> di sidebar untuk melihat detail dan mengambil tindakan pada respons risiko klien.
        </p>
      </div>
    </div>
  );
}
