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

const statusColor: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-700",
};

const slaColor: Record<string, string> = {
  ok: "text-green-600",
  warning: "text-yellow-600",
  breached: "text-red-600",
};

export default function PMFollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadFollowUps();
  }, []);

  async function loadFollowUps() {
    const res = await fetch("/api/followups");
    const data = await res.json();
    setFollowUps(data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string, notes?: string) {
    setUpdating(id);
    await fetch(`/api/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(notes !== undefined && { actionNotes: notes }) }),
    });
    await loadFollowUps();
    setUpdating(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Follow-up Tindak Lanjut</h1>
      <p className="text-gray-500 text-sm mb-6">Respons klien yang memerlukan tindak lanjut</p>

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
                    <div className="text-sm text-gray-500 mb-2">
                      Responden: {f.respondentName || "—"} · Diterima: {formatDateTime(new Date(f.submittedAt))}
                    </div>
                    <div className="flex gap-4 text-sm mb-3">
                      <span>Skor: <strong className={f.scoreOverall && f.scoreOverall <= 2 ? "text-red-600" : ""}>{f.scoreOverall?.toFixed(1) ?? "—"}/5</strong></span>
                      <span>NPS: <strong className={f.nps !== null && f.nps <= 6 ? "text-red-600" : ""}>{f.nps ?? "—"}</strong></span>
                    </div>
                    {f.comments && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic mb-3">
                        "{f.comments}"
                      </div>
                    )}
                    {f.actionNotes && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Catatan:</span> {f.actionNotes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[f.status]}`}>{f.status}</span>
                    <span className={`text-xs font-medium ${slaColor[sla]}`}>SLA: {sla.toUpperCase()}</span>
                  </div>
                </div>
                {f.status !== "RESOLVED" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    {f.status === "OPEN" && (
                      <button
                        disabled={updating === f.id}
                        onClick={() => updateStatus(f.id, "IN_PROGRESS")}
                        className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-200 transition disabled:opacity-50"
                      >
                        Tandai In Progress
                      </button>
                    )}
                    <button
                      disabled={updating === f.id}
                      onClick={() => updateStatus(f.id, "RESOLVED")}
                      className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-medium hover:bg-green-200 transition disabled:opacity-50"
                    >
                      Tandai Selesai
                    </button>
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
