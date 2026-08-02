"use client";

import { useEffect, useState } from "react";
import { formatDateTime, getSlaStatus } from "@/lib/utils";

interface FollowUp {
  id: string;
  responseId: string;
  ownerId: string | null;
  ownerName: string | null;
  actionNotes: string | null;
  status: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  scoreOverall: number | null;
  nps: number | null;
  respondentName: string | null;
  comments: string | null;
  submittedAt: string;
  projectName: string | null;
  clientCompany: string | null;
}

interface PM { id: string; name: string; role: string; }

const statusColor: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-700",
};

export default function BUFollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [pms, setPms] = useState<PM[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [fu, users] = await Promise.all([
      fetch("/api/followups").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]);
    setFollowUps(fu);
    setPms(Array.isArray(users) ? users.filter((u: PM) => u.role === "PM") : []);
    setLoading(false);
  }

  async function assignPM(id: string, ownerId: string) {
    setAssigning(id);
    await fetch(`/api/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId }),
    });
    await loadData();
    setAssigning(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Follow-up BU</h1>
      <p className="text-gray-500 text-sm mb-6">Tetapkan tindak lanjut ke Project Manager</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat data...</div>
      ) : followUps.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Tidak ada follow-up aktif.</div>
      ) : (
        <div className="space-y-4">
          {followUps.map((f) => {
            const sla = getSlaStatus(new Date(f.submittedAt), f.resolvedAt ? new Date(f.resolvedAt) : null);
            return (
              <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{f.clientCompany}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-sm text-gray-500">{f.projectName}</span>
                    </div>
                    <div className="flex gap-4 text-sm mb-3">
                      <span>Skor: <strong className={f.scoreOverall !== null && f.scoreOverall <= 2 ? "text-red-600" : ""}>{f.scoreOverall?.toFixed(1) ?? "—"}/5</strong></span>
                      <span>NPS: <strong className={f.nps !== null && f.nps <= 6 ? "text-red-600" : ""}>{f.nps ?? "—"}</strong></span>
                      <span className={`font-medium ${sla === "ok" ? "text-green-600" : sla === "warning" ? "text-yellow-600" : "text-red-600"}`}>SLA: {sla.toUpperCase()}</span>
                    </div>
                    {f.comments && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic mb-3">"{f.comments}"</div>
                    )}
                    <div className="text-sm text-gray-500">
                      PM: <strong>{f.ownerName || "Belum ditugaskan"}</strong>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[f.status]}`}>{f.status}</span>
                </div>
                {f.status !== "RESOLVED" && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-600">Tugaskan ke PM:</span>
                    <select
                      defaultValue={f.ownerId || ""}
                      onChange={(e) => assignPM(f.id, e.target.value)}
                      disabled={assigning === f.id}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none disabled:opacity-50"
                    >
                      <option value="">— Pilih PM —</option>
                      {pms.map((pm) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
