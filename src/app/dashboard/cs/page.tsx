"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface Survey {
  id: string;
  status: string;
  notes: string | null;
  projectName: string | null;
  clientCompany: string | null;
  expiresAt: string;
  sentAt: string | null;
  createdAt: string;
  projectId: string;
}

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  EXPIRED: "bg-red-100 text-red-600",
};

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Terkirim",
  COMPLETED: "Selesai",
  EXPIRED: "Kadaluarsa",
};

const statusIcon: Record<string, string> = {
  DRAFT: "○",
  SENT: "◔",
  COMPLETED: "●",
  EXPIRED: "✕",
};

// Flow indicator component
function StatusFlow({ current }: { current: string }) {
  const steps = ["DRAFT", "SENT", "COMPLETED"];
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isDone = steps.indexOf(current) > i;
        const isCurrent = current === step;
        const isExpired = current === "EXPIRED";
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={`text-xs px-2 py-0.5 rounded font-medium ${
              isExpired && step !== "COMPLETED" ? "text-red-400 bg-red-50" :
              isDone ? "text-green-700 bg-green-50" :
              isCurrent ? "text-indigo-700 bg-indigo-50" :
              "text-gray-400 bg-gray-50"
            }`}>
              {step === "DRAFT" ? "Draft" : step === "SENT" ? "Terkirim" : "Selesai"}
            </div>
            {i < steps.length - 1 && <span className="text-gray-300 text-xs">→</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function CSDashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/surveys").then((r) => r.json()).then((d) => { setSurveys(d); setLoading(false); });
  }, []);

  const filtered = filter === "ALL" ? surveys : surveys.filter((s) => s.status === filter);
  const searched = search.trim()
    ? filtered.filter(s =>
        s.clientCompany?.toLowerCase().includes(search.toLowerCase()) ||
        s.projectName?.toLowerCase().includes(search.toLowerCase()) ||
        s.notes?.toLowerCase().includes(search.toLowerCase())
      )
    : filtered;
  const sorted = searched.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const counts = {
    ALL: surveys.length,
    DRAFT: surveys.filter((s) => s.status === "DRAFT").length,
    SENT: surveys.filter((s) => s.status === "SENT").length,
    COMPLETED: surveys.filter((s) => s.status === "COMPLETED").length,
    EXPIRED: surveys.filter((s) => s.status === "EXPIRED").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Survei</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola survei klien — Draft → Terkirim → Selesai</p>
        </div>
        <Link
          href="/dashboard/cs/create"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Buat Survei
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {(["ALL", "DRAFT", "SENT", "COMPLETED", "EXPIRED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-xl border p-4 text-left transition ${filter === s ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <div className={`text-2xl font-bold ${s === "COMPLETED" ? "text-green-600" : s === "DRAFT" ? "text-gray-600" : s === "SENT" ? "text-yellow-600" : s === "EXPIRED" ? "text-red-500" : "text-indigo-600"}`}>
              {counts[s]}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{s === "ALL" ? "Semua" : statusLabel[s]}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama perusahaan, proyek, atau catatan..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat data...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          {search.trim() ? `Tidak ada survei yang cocok dengan "${search}".` : filter === "ALL" ? "Belum ada survei." : `Tidak ada survei berstatus ${statusLabel[filter]}.`}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Klien / Proyek</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Alur Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kadaluarsa</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Catatan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{s.clientCompany}</div>
                    <div className="text-gray-400 text-xs">{s.projectName}</div>
                  </td>
                  <td className="px-4 py-3">
                    {s.status === "EXPIRED"
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Kadaluarsa</span>
                      : <StatusFlow current={s.status} />
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(s.expiresAt)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-32 truncate">{s.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/cs/surveys/${s.id}`}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                      >
                        {s.status === "DRAFT" ? "Edit & Kirim" : "Detail"}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
