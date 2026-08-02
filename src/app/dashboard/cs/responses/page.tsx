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

const followUpColor: Record<string, string> = {
  NONE: "bg-gray-100 text-gray-600",
  NEEDS_FOLLOWUP: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-700",
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

  if (questions.length === 0) return (
    <div className="text-xs text-gray-400 mt-2">Memuat pertanyaan...</div>
  );

  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      <div className="text-xs font-semibold text-gray-500 mb-2">Breakdown per Pertanyaan</div>
      {questions.map((q, i) => {
        const val = parsed[String(i)];
        if (!val) return null;
        return (
          <div key={i} className="text-xs">
            <div className="text-gray-500 mb-1 truncate">{i + 1}. {q.label}</div>
            {q.type === "rating" ? (
              <ScoreBar value={Number(val)} max={5} />
            ) : q.type === "nps" ? (
              <ScoreBar value={Number(val)} max={10} />
            ) : (
              <div className="text-gray-700 bg-gray-50 rounded px-2 py-1">{val}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CSResponsesPage() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "score_asc" | "nps_asc" | "risk">("date");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/responses").then((r) => r.json()).then((d) => { setResponses(d); setLoading(false); });
  }, []);

  const sorted = [...responses]
    .filter(r => filterStatus === "ALL" || r.followUpStatus === filterStatus)
    .sort((a, b) => {
      if (sortBy === "score_asc") return (a.scoreOverall ?? 99) - (b.scoreOverall ?? 99);
      if (sortBy === "nps_asc") return (a.nps ?? 99) - (b.nps ?? 99);
      if (sortBy === "risk") {
        const riskA = (a.scoreOverall !== null && a.scoreOverall <= 2) || (a.nps !== null && a.nps <= 6) ? 0 : 1;
        const riskB = (b.scoreOverall !== null && b.scoreOverall <= 2) || (b.nps !== null && b.nps <= 6) ? 0 : 1;
        return riskA - riskB;
      }
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

  const riskCount = responses.filter(r =>
    (r.scoreOverall !== null && r.scoreOverall <= 2) || (r.nps !== null && r.nps <= 6)
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Semua Respons</h1>
          <p className="text-gray-500 text-sm mt-1">{responses.length} respons diterima · {riskCount > 0 && <span className="text-red-600 font-medium">{riskCount} berisiko</span>}</p>
        </div>
      </div>

      {/* Filters & Sort */}
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
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">Belum ada respons.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((r) => {
            const isRisk = (r.scoreOverall !== null && r.scoreOverall <= 2) || (r.nps !== null && r.nps <= 6);
            const isExpanded = expandedId === r.id;
            const hasAnswers = !!r.answers;
            return (
              <div key={r.id} className={`bg-white rounded-xl border px-5 py-4 transition ${isRisk ? "border-red-200" : "border-gray-200"}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{r.clientCompany}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{r.projectName}</span>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      {r.respondentName || "Anonim"} · {formatDateTime(r.submittedAt)}
                    </div>

                    {/* Score overview */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Skor:</span>
                        <span className={`font-bold ${r.scoreOverall !== null && r.scoreOverall <= 2 ? "text-red-600" : r.scoreOverall !== null && r.scoreOverall >= 4 ? "text-green-600" : "text-gray-800"}`}>
                          {r.scoreOverall?.toFixed(1) ?? "—"}<span className="text-gray-400 font-normal text-xs">/5</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">NPS:</span>
                        <span className={`font-bold ${r.nps !== null && r.nps <= 6 ? "text-red-600" : r.nps !== null && r.nps >= 9 ? "text-green-600" : "text-gray-800"}`}>
                          {r.nps ?? "—"}
                        </span>
                      </div>
                      {r.comments && (
                        <span className="text-xs text-gray-400 italic truncate max-w-48">"{r.comments}"</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${followUpColor[r.followUpStatus]}`}>
                      {r.followUpStatus.replace("_", " ")}
                    </span>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/cs/surveys/${r.surveyId}`}
                        className="text-xs text-indigo-600 hover:underline font-medium">
                        Lihat Survei
                      </Link>
                      {hasAnswers && (
                        <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50 transition">
                          {isExpanded ? "Tutup ▲" : "Detail ▼"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable per-question breakdown */}
                {isExpanded && r.answers && (
                  <AnswerBreakdown answers={r.answers} surveyId={r.surveyId} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
