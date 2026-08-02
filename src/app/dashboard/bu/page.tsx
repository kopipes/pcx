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

export default function BUDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Memuat analitik...</div>;
  if (!data) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Analitik Business Unit</h1>
      <p className="text-gray-500 text-sm mb-6">Monitoring kualitas layanan per unit bisnis</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Respons" value={data.totalResponses} unit="" color="indigo" />
        <KpiCard label="CSAT" value={data.csat} unit="%" color={data.csat >= 85 ? "green" : "red"} target="Target: ≥85%" />
        <KpiCard label="NPS" value={data.npsScore} unit="" color={data.npsScore >= 50 ? "green" : "red"} target="Target: ≥+50" />
        <KpiCard label="SLA Follow-up" value={data.slaPct} unit="%" color={data.slaPct >= 95 ? "green" : "red"} target="Target: ≥95%" />
      </div>

      {data.riskCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <span className="text-lg">⚠</span>
            <span className="font-medium">{data.riskCount} respons berisiko memerlukan tindak lanjut segera</span>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Performa per Business Unit</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Business Unit</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Respons</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Avg Skor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">CSAT</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">NPS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.buStats.map((bu) => (
              <tr key={bu.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{bu.name}</td>
                <td className="px-4 py-3 text-gray-600">{bu.totalResponses}</td>
                <td className="px-4 py-3">
                  <span className={bu.avgOverall >= 4 ? "text-green-600 font-semibold" : bu.avgOverall <= 2 ? "text-red-600 font-semibold" : "text-gray-900"}>
                    {bu.avgOverall.toFixed(1)}/5
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={bu.csat >= 85 ? "text-green-600" : "text-red-600"}>{bu.csat}%</span>
                </td>
                <td className="px-4 py-3">
                  <span className={bu.nps >= 50 ? "text-green-600" : "text-red-600"}>{bu.nps}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, color, target }: { label: string; value: number; unit: string; color: string; target?: string }) {
  const colors: Record<string, string> = {
    indigo: "text-indigo-600", green: "text-green-600", red: "text-red-600", yellow: "text-yellow-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`text-3xl font-bold ${colors[color]}`}>{value}{unit}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {target && <div className="text-xs text-gray-400 mt-0.5">{target}</div>}
    </div>
  );
}
