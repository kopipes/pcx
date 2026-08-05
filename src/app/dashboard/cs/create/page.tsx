"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Project { id: string; projectName: string; clientCompany: string; }
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
  questionCount: number;
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

export default function CreateSurveyPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [projectId, setProjectId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [notes, setNotes] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [loading, setLoading] = useState(false);
  const [surveysLoading, setSurveysLoading] = useState(true);
  const [pendingQuestions, setPendingQuestions] = useState<{ type: string; label: string; required: boolean; options?: string }[]>([]);
  const [reuseSource, setReuseSource] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string; token: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/surveys").then((r) => r.json()),
    ]).then(([p, s]) => {
      setProjects(p);
      setSurveys(s);
      setSurveysLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, expiresInDays, notes, allowMultiple, asDraft: true }),
    });
    let data: { error?: string; id?: string; token?: string } = {};
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) { setError(data.error || "Gagal membuat survei. Coba logout dan login kembali."); setLoading(false); return; }
    const newSurvey = data as { id: string; token: string };

    // Auto-save carried-over questions to new draft
    if (pendingQuestions.length > 0 && newSurvey.id) {
      await fetch(`/api/surveys/${newSurvey.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: pendingQuestions }),
      });
      setPendingQuestions([]);
      setReuseSource(null);
      // Redirect directly to detail page so user sees questions are loaded
      router.push(`/dashboard/cs/surveys/${newSurvey.id}`);
      return;
    }

    setSuccess(newSurvey);
    setSurveys((prev) => [{
      ...data,
      questionCount: 0,
      projectName: projects.find(p => p.id === projectId)?.projectName || null,
      clientCompany: projects.find(p => p.id === projectId)?.clientCompany || null,
    } as Survey, ...prev]);
    setLoading(false);
  }

  async function reuseAsDraft(survey: Survey) {
    setProjectId(survey.projectId);
    setNotes(survey.notes || "");
    setExpiresInDays(7);
    setSuccess(null);
    setReuseSource(survey.id);
    // Fetch questions from old survey
    const res = await fetch(`/api/surveys/${survey.id}/questions`);
    const qs = await res.json();
    setPendingQuestions(Array.isArray(qs) && qs.length > 0 ? qs : []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const surveyUrl = success ? `${typeof window !== "undefined" ? window.location.origin : ""}/survey/${success.token}` : "";

  return (
    <div className="flex gap-6 items-start">
      {/* LEFT: Form */}
      <div className="w-96 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Buat Survei Baru</h1>

        {!success ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Proyek</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                <option value="">-- Pilih proyek --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.clientCompany} – {p.projectName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kadaluarsa (hari)</label>
              <input
                type="number" min={1} max={30} value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Internal (opsional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Mis: survei untuk project phase 2..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
              />
            </div>

            {/* Mode distribusi link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode Link</label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition text-xs ${!allowMultiple ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="linkMode" checked={!allowMultiple} onChange={() => setAllowMultiple(false)} className="mt-0.5 text-indigo-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Link Per Orang</div>
                    <div className="text-gray-500 mt-0.5">Satu link diisi satu kali. Gunakan fitur Penerima untuk kirim ke banyak orang.</div>
                  </div>
                </label>
                <label className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition text-xs ${allowMultiple ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="linkMode" checked={allowMultiple} onChange={() => setAllowMultiple(true)} className="mt-0.5 text-indigo-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Link Umum</div>
                    <div className="text-gray-500 mt-0.5">Satu link bisa diisi banyak orang. Setiap orang mengisi identitas sendiri.</div>
                  </div>
                </label>
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

            {pendingQuestions.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700 flex items-center justify-between">
                <span>✓ {pendingQuestions.length} pertanyaan dari survei sebelumnya akan disalin otomatis</span>
                <button type="button" onClick={() => { setPendingQuestions([]); setReuseSource(null); }}
                  className="text-green-500 hover:text-green-700 ml-2 font-bold">✕</button>
              </div>
            )}

            <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
              {pendingQuestions.length > 0
                ? <>Draft akan dibuat dan <strong>{pendingQuestions.length} pertanyaan disalin otomatis</strong>, lalu langsung dibuka untuk diedit.</>
                : <>Survei dibuat sebagai <strong>Draft</strong>. Anda bisa tambah pertanyaan sebelum mengirim link ke klien.</>
              }
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition text-sm"
            >
              {loading ? "Membuat..." : pendingQuestions.length > 0 ? "Buat Draft & Salin Pertanyaan" : "Buat Draft Survei"}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
              <span className="text-lg">✓</span>
              <span className="font-medium text-sm">Draft survei berhasil dibuat!</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
              <div className="font-medium text-gray-700 mb-2">Langkah selanjutnya:</div>
              <div className="flex items-start gap-2"><span className="text-indigo-600 font-bold">1.</span><span>Tambahkan pertanyaan survei</span></div>
              <div className="flex items-start gap-2"><span className="text-indigo-600 font-bold">2.</span><span>Klik "Kirim" untuk mengaktifkan magic link</span></div>
              <div className="flex items-start gap-2"><span className="text-indigo-600 font-bold">3.</span><span>Salin link dan kirim ke klien</span></div>
            </div>
            <Link
              href={`/dashboard/cs/surveys/${success.id}`}
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition text-sm"
            >
              Buka & Edit Draft →
            </Link>
            <button
              onClick={() => { setSuccess(null); setProjectId(""); setNotes(""); }}
              className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Buat Survei Lain
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: Survey history */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Survei</h2>
          <span className="text-xs text-gray-400">Klik "Gunakan Lagi" untuk menyalin pertanyaan survei sebelumnya</span>
        </div>

        {surveysLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Memuat...</div>
        ) : surveys.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            Belum ada survei.
          </div>
        ) : (
          <div className="space-y-2">
            {surveys.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((s) => (
              <div key={s.id} className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-4 ${reuseSource === s.id ? "border-indigo-300 bg-indigo-50" : "border-gray-200"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">{s.clientCompany}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500 truncate">{s.projectName}</span>
                  </div>
                  {s.notes && <div className="text-xs text-gray-400 mt-0.5 truncate">{s.notes}</div>}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{formatDate(s.createdAt)}</span>
                    {s.questionCount > 0 ? (
                      <span className="text-xs text-indigo-600 font-medium">{s.questionCount} pertanyaan</span>
                    ) : (
                      <span className="text-xs text-gray-300">0 pertanyaan</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[s.status]}`}>
                    {statusLabel[s.status]}
                  </span>
                  <Link href={`/dashboard/cs/surveys/${s.id}`} className="text-xs text-indigo-600 hover:underline font-medium px-2 py-1 rounded hover:bg-indigo-50 transition">
                    Detail
                  </Link>
                  {s.questionCount > 0 && (
                    <button
                      onClick={() => reuseAsDraft(s)}
                      className={`text-xs font-medium px-2 py-1 rounded border transition ${reuseSource === s.id ? "bg-indigo-600 text-white border-indigo-600" : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50 border-gray-200"}`}
                    >
                      {reuseSource === s.id ? "✓ Dipilih" : "Gunakan Lagi"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
