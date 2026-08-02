"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";

interface Response {
  id: string;
  projectName: string;
  clientCompany: string;
  scoreOverall: number | null;
  nps: number | null;
  followUpStatus: string;
  respondentName: string | null;
  comments: string | null;
  submittedAt: string;
}

const followUpColor: Record<string, string> = {
  NONE: "bg-gray-100 text-gray-600",
  NEEDS_FOLLOWUP: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-700",
};

export default function CSResponsesPage() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/responses").then((r) => r.json()).then((d) => { setResponses(d); setLoading(false); });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Semua Respons</h1>
      <p className="text-gray-500 text-sm mb-6">Seluruh feedback yang telah diterima dari klien</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat data...</div>
      ) : responses.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Belum ada respons.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Klien / Proyek</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Responden</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Skor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">NPS</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Follow-up</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {responses.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.clientCompany}</div>
                    <div className="text-xs text-gray-400">{r.projectName}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.respondentName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${r.scoreOverall && r.scoreOverall <= 2 ? "text-red-600" : "text-gray-900"}`}>
                      {r.scoreOverall?.toFixed(1) ?? "—"}
                    </span>
                    <span className="text-gray-400 text-xs"> /5</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${r.nps !== null && r.nps <= 6 ? "text-red-600" : "text-gray-900"}`}>
                      {r.nps ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${followUpColor[r.followUpStatus]}`}>
                      {r.followUpStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(new Date(r.submittedAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
