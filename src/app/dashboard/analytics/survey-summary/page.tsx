"use client";

import { useEffect, useState } from "react";

interface QuestionStat {
  id: string;
  label: string;
  type: "rating" | "nps" | "select";
  options: string | null;
  responseCount: number;
  avg?: number | null;
  distribution?: { opt: string; count: number; pct: number }[];
  respondentAnswers?: { name: string; value: string }[];
}

interface SurveySummary {
  surveyId: string;
  projectName: string | null;
  clientCompany: string | null;
  businessUnitName: string | null;
  status: string;
  totalResponses: number;
  questions: QuestionStat[];
}

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  EXPIRED: "bg-red-100 text-red-600",
};
const statusLabel: Record<string, string> = {
  DRAFT: "Draft", SENT: "Aktif", COMPLETED: "Selesai", EXPIRED: "Kadaluarsa",
};

function RatingBar({ avg, max }: { avg: number; max: number }) {
  const pct = (avg / max) * 100;
  const color = avg >= max * 0.7 ? "bg-green-500" : avg >= max * 0.4 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{avg}</span>
    </div>
  );
}

function DistributionBar({ distribution, total }: { distribution: { opt: string; count: number; pct: number }[]; total: number }) {
  const colors = ["bg-indigo-500", "bg-blue-400", "bg-teal-400", "bg-green-400", "bg-yellow-400", "bg-orange-400", "bg-red-400"];
  return (
    <div className="space-y-2">
      {distribution.map((d, i) => (
        <div key={d.opt} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-32 truncate">{d.opt}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className={`${colors[i % colors.length]} h-2 rounded-full transition-all`} style={{ width: `${d.pct}%` }} />
          </div>
          <span className="text-xs text-gray-600 w-16 text-right">{d.count} ({d.pct}%)</span>
        </div>
      ))}
      <div className="text-xs text-gray-400 pt-1">{total} responden</div>
    </div>
  );
}

export default function SurveySummaryPage() {
  const [data, setData] = useState<SurveySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/survey-summary")
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = data.filter(s =>
    !search ||
    (s.projectName?.toLowerCase().includes(search.toLowerCase()) ||
     s.clientCompany?.toLowerCase().includes(search.toLowerCase()) ||
     s.businessUnitName?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ringkasan Survei</h1>
        <p className="text-sm text-gray-500 mt-1">Rata-rata dan distribusi jawaban per survei</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari proyek, klien, atau BU..."
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {search ? "Tidak ada survei yang cocok." : "Belum ada survei dengan respons."}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(survey => {
            const isOpen = expanded.has(survey.surveyId);
            return (
              <div key={survey.surveyId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Survey header */}
                <button
                  onClick={() => toggleExpand(survey.surveyId)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{survey.clientCompany}</span>
                        <span className="text-gray-400 text-xs">—</span>
                        <span className="text-gray-600 text-sm">{survey.projectName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[survey.status] || "bg-gray-100 text-gray-600"}`}>
                          {statusLabel[survey.status] || survey.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {survey.businessUnitName && <span>BU: {survey.businessUnitName}</span>}
                        <span>{survey.totalResponses} respons</span>
                        <span>{survey.questions.length} pertanyaan terukur</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm ml-4 flex-shrink-0">{isOpen ? "▲" : "▼"}</span>
                </button>

                {/* Questions */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {survey.questions.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-gray-400">Tidak ada pertanyaan terukur.</div>
                    ) : (
                      survey.questions.map((q, idx) => (
                        <div key={q.id} className="px-5 py-4">
                          <div className="flex items-start gap-2 mb-3">
                            <span className="text-xs text-gray-400 font-medium mt-0.5">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-medium text-gray-800">{q.label}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  q.type === "rating" ? "bg-blue-50 text-blue-600" :
                                  q.type === "nps" ? "bg-purple-50 text-purple-600" :
                                  "bg-teal-50 text-teal-600"
                                }`}>
                                  {q.type === "rating" ? "Rating 1–5" : q.type === "nps" ? "NPS 0–10" : "Pilihan Ganda"}
                                </span>
                              </div>
                              {(q.type === "rating" || q.type === "nps") && q.avg !== null && q.avg !== undefined ? (
                                <div className="mt-2">
                                  <RatingBar avg={q.avg} max={q.type === "rating" ? 5 : 10} />
                                  <div className="text-xs text-gray-400 mt-1">{q.responseCount} responden</div>
                                  {q.respondentAnswers && q.respondentAnswers.length > 0 && (
                                    <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                                      {q.respondentAnswers.map((ra, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                          <span className="text-gray-500 font-medium truncate max-w-[160px]">{ra.name}</span>
                                          <span className="text-gray-300">:</span>
                                          <span className={`font-semibold ${parseFloat(ra.value) >= (q.type === "rating" ? 4 : 8) ? "text-green-600" : parseFloat(ra.value) >= (q.type === "rating" ? 2.5 : 5) ? "text-yellow-600" : "text-red-500"}`}>{ra.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (q.type === "rating" || q.type === "nps") && (
                                <div className="text-xs text-gray-400">Belum ada jawaban</div>
                              )}
                              {q.type === "select" && q.distribution ? (
                                <div className="mt-2">
                                  <DistributionBar distribution={q.distribution} total={q.responseCount} />
                                  {q.respondentAnswers && q.respondentAnswers.length > 0 && (
                                    <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                                      {q.respondentAnswers.map((ra, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                          <span className="text-gray-500 font-medium truncate max-w-[160px]">{ra.name}</span>
                                          <span className="text-gray-300">:</span>
                                          <span className="text-gray-700">{ra.value === "__lainnya__" ? "Lainnya" : ra.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : q.type === "select" && (
                                <div className="text-xs text-gray-400">Belum ada jawaban</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
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
