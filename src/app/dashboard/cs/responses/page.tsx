"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface Response {
  id: string;
  surveyId: string;
  projectName: string | null;
  clientCompany: string | null;
  scoreOverall: number | null;
  nps: number | null;
  followUpStatus: string;
  respondentName: string | null;
  comments: string | null;
  answers: string | null;
  submittedAt: string;
}

interface SurveyGroup {
  surveyId: string;
  projectName: string | null;
  clientCompany: string | null;
  responses: Response[];
}

const followUpColor: Record<string, string> = {
  NONE: "bg-gray-100 text-gray-600",
  NEEDS_FOLLOWUP: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-700",
};

const followUpLabel: Record<string, string> = {
  NONE: "OK",
  NEEDS_FOLLOWUP: "Needs Follow-up",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

function ScoreBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = value <= 2 ? "bg-red-500" : value <= 3 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold w-6 text-right ${value <= 2 ? "text-red-600" : value <= 3 ? "text-yellow-600" : "text-green-600"}`}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function AnswerBreakdown({ answers, surveyId }: { answers: string; surveyId: string }) {
  const [questions, setQuestions] = useState<{ label: string; type: string }[]>([]);
  useEffect(() => {
    fetch(`/api/surveys/${surveyId}/questions`)
      .then(r => r.json())
      .then(q => { if (Array.isArray(q)) setQuestions(q); });
  }, [surveyId]);
  const parsed: Record<string, string> = JSON.parse(answers);
  if (questions.length === 0) return <div className="text-xs text-gray-400 mt-2">Memuat pertanyaan...</div>;
  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      <div className="text-xs font-semibold text-gray-500 mb-2">Breakdown per Pertanyaan</div>
      {questions.map((q, i) => {
        const val = parsed[String(i)];
        if (!val) return null;
        const numVal = Number(val);
        const isLow = q.type === "rating" && numVal <= 2;
        return (
          <div key={i} className={`rounded-lg p-2 ${isLow ? "bg-red-50" : "bg-gray-50"}`}>
            <div className="text-xs text-gray-500 mb-1"><span className="font-medium">{i + 1}.</span> {q.label}</div>
            {q.type === "rating" && (
              <div className="flex items-center gap-2">
                <ScoreBar value={numVal} max={5} />
                {isLow && <span className="text-xs text-red-600 font-medium">Rendah</span>}
              </div>
            )}
            {q.type === "nps" && (
              <span className={`text-sm font-bold ${numVal <= 6 ? "text-red-600" : numVal >= 9 ? "text-green-600" : "text-yellow-600"}`}>
                NPS: {val} {numVal <= 6 ? "— Detractor" : numVal <= 8 ? "— Passive" : "— Promoter"}
              </span>
            )}
            {q.type === "select" && (
              <span className="inline-block px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-700">{val}</span>
            )}
            {q.type === "text" && (
              <div className="text-xs text-gray-700 italic">"{val}"</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResponseCard({ r, expandedId, setExpandedId }: {
  r: Response;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  const isRisk = (r.scoreOverall !== null && r.scoreOverall <= 2) || (r.nps !== null && r.nps <= 6);
  const isExpanded = expandedId === r.id;
  return (
    <div className={`rounded-lg border px-4 py-3 ${isRisk ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isRisk && <span className="text-red-500 text-xs">⚠</span>}
            <span className="font-medium text-sm text-gray-900">{r.respondentName || "Anonim"}</span>
            <span className="text-xs text-gray-400">{formatDateTime(r.submittedAt)}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {r.scoreOverall !== null && (
              <span className={`font-semibold ${r.scoreOverall <= 2 ? "text-red-600" : r.scoreOverall >= 4 ? "text-green-600" : "text-gray-700"}`}>
                Skor: {r.scoreOverall.toFixed(1)}/5
              </span>
            )}
            {r.nps !== null && (
              <span className={`font-semibold ${r.nps <= 6 ? "text-red-600" : r.nps >= 9 ? "text-green-600" : "text-gray-700"}`}>
                NPS: {r.nps}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${followUpColor[r.followUpStatus]}`}>
                {followUpLabel[r.followUpStatus] || r.followUpStatus.replace("_", " ")}
          </span>
          {r.answers && (
            <button
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
              className="text-xs text-indigo-600 hover:underline font-medium border border-indigo-200 rounded px-2 py-0.5 hover:bg-indigo-50 transition"
            >
              {isExpanded ? "Tutup ▲" : "Detail ▼"}
            </button>
          )}
        </div>
      </div>
      {isExpanded && r.answers && (
        <AnswerBreakdown answers={r.answers} surveyId={r.surveyId} />
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function CSResponsesPage() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "score_asc" | "nps_asc" | "risk">("date");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/responses").then(r => r.json()).then(d => { setResponses(d); setLoading(false); });
  }, []);

  useEffect(() => { setPage(1); }, [filterStatus, sortBy]);

  // Group by surveyId
  const groupMap: Record<string, SurveyGroup> = {};
  const grouped: SurveyGroup[] = [];
  const filtered = responses.filter(r => filterStatus === "ALL" || r.followUpStatus === filterStatus);

  filtered.forEach(r => {
    if (!groupMap[r.surveyId]) {
      groupMap[r.surveyId] = { surveyId: r.surveyId, projectName: r.projectName, clientCompany: r.clientCompany, responses: [] };
      grouped.push(groupMap[r.surveyId]);
    }
    groupMap[r.surveyId].responses.push(r);
  });

  grouped.forEach(g => {
    g.responses.sort((a, b) => {
      if (sortBy === "score_asc") return (a.scoreOverall ?? 99) - (b.scoreOverall ?? 99);
      if (sortBy === "nps_asc") return (a.nps ?? 99) - (b.nps ?? 99);
      if (sortBy === "risk") {
        const ra = (a.scoreOverall !== null && a.scoreOverall <= 2) || (a.nps !== null && a.nps <= 6) ? 0 : 1;
        const rb = (b.scoreOverall !== null && b.scoreOverall <= 2) || (b.nps !== null && b.nps <= 6) ? 0 : 1;
        return ra - rb;
      }
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  });

  const totalGroups = grouped.length;
  const totalPages = Math.ceil(totalGroups / PAGE_SIZE);
  const pagedGroups = grouped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalResponses = responses.length;
  const riskCount = responses.filter(r =>
    (r.scoreOverall !== null && r.scoreOverall <= 2) || (r.nps !== null && r.nps <= 6)
  ).length;

  function toggleGroup(surveyId: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(surveyId) ? next.delete(surveyId) : next.add(surveyId);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Semua Respons</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalResponses} respons · {totalGroups} survei
            {riskCount > 0 && <> · <span className="text-red-600 font-medium">{riskCount} berisiko</span></>}
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { value: "ALL", label: "Semua" },
            { value: "NEEDS_FOLLOWUP", label: "Perlu Tindak Lanjut" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "RESOLVED", label: "Selesai" },
            { value: "NONE", label: "Normal" },
          ].map(f => (
            <button key={f.value} onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${filterStatus === f.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-400 outline-none bg-white">
          <option value="date">Terbaru</option>
          <option value="score_asc">Skor Terendah</option>
          <option value="nps_asc">NPS Terendah</option>
          <option value="risk">Risiko Dulu</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat data...</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">Belum ada respons.</div>
      ) : (
        <div>
          <div className="space-y-4 mb-4">
            {pagedGroups.map(group => {
              const isCollapsed = collapsedGroups.has(group.surveyId);
              const groupRisk = group.responses.filter(r =>
                (r.scoreOverall !== null && r.scoreOverall <= 2) || (r.nps !== null && r.nps <= 6)
              ).length;
              const validScores = group.responses.filter(r => r.scoreOverall !== null);
              const avgScore = validScores.length > 0
                ? validScores.reduce((s, r) => s + (r.scoreOverall || 0), 0) / validScores.length
                : null;
              return (
                <div key={group.surveyId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleGroup(group.surveyId)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}>›</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{group.clientCompany}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-sm text-gray-500">{group.projectName}</span>
                          {groupRisk > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              {groupRisk} risiko
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {group.responses.length} responden
                          {avgScore !== null && (
                            <> · rata-rata skor <span className={`font-medium ${avgScore <= 2 ? "text-red-600" : avgScore >= 4 ? "text-green-600" : "text-yellow-600"}`}>{avgScore.toFixed(1)}/5</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/cs/surveys/${group.surveyId}`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-indigo-600 hover:underline font-medium flex-shrink-0"
                    >
                      Lihat Survei
                    </Link>
                  </button>
                  {!isCollapsed && (
                    <div className="px-5 pb-4 space-y-2 border-t border-gray-100 pt-3">
                      {group.responses.map(r => (
                        <ResponseCard
                          key={r.id}
                          r={r}
                          expandedId={expandedId}
                          setExpandedId={setExpandedId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <div className="text-xs text-gray-500">
                Halaman {page} dari {totalPages} · {totalGroups} survei total
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition">‹ Sebelumnya</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (arr[idx - 1] as number) + 1 < p) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) => p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-xs text-gray-400">...</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p as number)}
                      className={`px-3 py-1.5 text-xs border rounded-lg transition ${page === p ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 hover:bg-gray-50"}`}>
                      {p}
                    </button>
                  ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition">Selanjutnya ›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition">»</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
