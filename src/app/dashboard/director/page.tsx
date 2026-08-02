"use client";

import { useEffect, useState } from "react";

interface Analytics {
  totalResponses: number;
  npsScore: number;
  csat: number;
  riskCount: number;
  slaPct: number;
  buStats: { id: string; name: string; totalResponses: number; nps: number; csat: number; avgOverall: number }[];
}

export default function DirectorDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Memuat laporan eksekutif...</div>;
  if (!data) return null;

  const npsStatus = data.npsScore >= 50 ? "green" : data.npsScore >= 30 ? "yellow" : "red";
  const csatStatus = data.csat >= 85 ? "green" : data.csat >= 70 ? "yellow" : "red";
  const slaStatus = data.slaPct >= 95 ? "green" : data.slaPct >= 80 ? "yellow" : "red";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Laporan Eksekutif</h1>
        <p className="text-gray-500 text-sm mt-1">Ringkasan KPI lintas Business Unit — Provaliant PCX</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <ExecKpi label="Total Respons" value={String(data.totalResponses)} status="green" />
        <ExecKpi label="CSAT" value={`${data.csat}%`} status={csatStatus} target="≥85%" />
        <ExecKpi label="NPS Score" value={`+${data.npsScore}`} status={npsStatus} target="≥+50" />
        <ExecKpi label="SLA Follow-up" value={`${data.slaPct}%`} status={slaStatus} target="≥95%" />
      </div>

      {/* Risk Alert */}
      {data.riskCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠</div>
            <div>
              <div className="font-semibold text-red-800 mb-1">Peringatan Risiko Klien</div>
              <div className="text-red-700 text-sm">
                Terdapat <strong>{data.riskCount} respons berisiko</strong> (Skor ≤2 atau NPS ≤6) yang memerlukan eskalasi segera. Tim PM dan CS telah diwajibkan merespons dalam SLA 1–2 hari kerja.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-BU Comparison */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Perbandingan Lintas Business Unit</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Business Unit</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Respons</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Avg Skor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">CSAT</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">NPS</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.buStats.map((bu) => {
              const health = bu.csat >= 85 && bu.nps >= 50 ? "Baik" : bu.csat >= 70 ? "Perhatian" : "Risiko";
              const healthColor = health === "Baik" ? "bg-green-100 text-green-700" : health === "Perhatian" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-700";
              return (
                <tr key={bu.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{bu.name}</td>
                  <td className="px-4 py-3 text-gray-600">{bu.totalResponses}</td>
                  <td className="px-4 py-3 font-semibold">{bu.avgOverall.toFixed(1)}/5</td>
                  <td className="px-4 py-3"><span className={bu.csat >= 85 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{bu.csat}%</span></td>
                  <td className="px-4 py-3"><span className={bu.nps >= 50 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{bu.nps}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${healthColor}`}>{health}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExecKpi({ label, value, status, target }: { label: string; value: string; status: string; target?: string }) {
  const colors: Record<string, string> = { green: "text-green-600", yellow: "text-yellow-600", red: "text-red-600" };
  const bg: Record<string, string> = { green: "border-green-200 bg-green-50", yellow: "border-yellow-200 bg-yellow-50", red: "border-red-200 bg-red-50" };
  return (
    <div className={`rounded-xl border p-5 ${bg[status]}`}>
      <div className={`text-3xl font-bold ${colors[status]}`}>{value}</div>
      <div className="text-sm text-gray-700 mt-1 font-medium">{label}</div>
      {target && <div className="text-xs text-gray-500 mt-0.5">Target: {target}</div>}
    </div>
  );
}
