"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatDateTime, getSlaStatus } from "@/lib/utils";

interface Question {
  id?: string;
  type: "rating" | "nps" | "text" | "select" | "multiselect";
  label: string;
  required: boolean;
  options?: string;
  sortOrder?: number;
}

interface Recipient {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  token: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED";
  submittedAt: string | null;
  createdAt: string;
}

interface SurveyDetail {
  id: string;
  token: string | null;
  status: string;
  notes: string | null;
  allowMultiple: boolean | null;
  expiresAt: string;
  sentAt: string | null;
  createdAt: string;
  projectId: string;
  projectName: string | null;
  clientCompany: string | null;
  businessUnitId: string | null;
  businessUnitName: string | null;
  projectManagerName: string | null;
  responses: ResponseItem[];
}

interface ResponseItem {
  id: string;
  scoreOverall: number | null;
  nps: number | null;
  improvementArea: string | null;
  comments: string | null;
  followUpStatus: string;
  respondentName: string | null;
  respondentEmail: string | null;
  submittedAt: string;
  answers?: string | null;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  questions: Question[];
}

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  EXPIRED: "bg-red-100 text-red-600",
};
const statusLabel: Record<string, string> = {
  DRAFT: "Draft", SENT: "Terkirim", COMPLETED: "Selesai", EXPIRED: "Kadaluarsa",
};
const followUpColor: Record<string, string> = {
  NONE: "bg-gray-100 text-gray-600",
  NEEDS_FOLLOWUP: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-700",
};
const typeLabel: Record<string, string> = {
  rating: "Rating 1–5", nps: "NPS 0–10", text: "Teks Bebas", select: "Pilihan Ganda", multiselect: "Pilihan Berganda",
};

function QuestionRow({
  q, index, total,
  onChange, onRemove, onMove,
}: {
  q: Question; index: number; total: number;
  onChange: (i: number, q: Question) => void;
  onRemove: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
}) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-medium w-5">{index + 1}.</span>
        <select
          value={q.type}
          onChange={(e) => onChange(index, { ...q, type: e.target.value as Question["type"] })}
          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
        >
          {Object.entries(typeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="flex gap-1 ml-auto">
          <button onClick={() => onMove(index, -1)} disabled={index === 0} className="px-1.5 py-1 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">↑</button>
          <button onClick={() => onMove(index, 1)} disabled={index === total - 1} className="px-1.5 py-1 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">↓</button>
          <button onClick={() => onRemove(index)} className="px-1.5 py-1 text-xs text-red-400 hover:text-red-600">✕</button>
        </div>
      </div>
      <input
        value={q.label}
        onChange={(e) => onChange(index, { ...q, label: e.target.value })}
        placeholder="Teks pertanyaan..."
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
      />
      {(q.type === "select" || q.type === "multiselect") && (
        <input
          value={q.options || ""}
          onChange={(e) => onChange(index, { ...q, options: e.target.value })}
          placeholder={q.type === "multiselect" ? "Pilihan dipisah koma: Opsi A,Opsi B,Opsi C (bisa pilih banyak)" : "Pilihan dipisah koma: Opsi A,Opsi B,Opsi C"}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-400 outline-none"
        />
      )}
      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
        <input type="checkbox" checked={q.required} onChange={(e) => onChange(index, { ...q, required: e.target.checked })} />
        Wajib diisi
      </label>
    </div>
  );
}

function StatusFlow({ current }: { current: string }) {
  const steps = ["DRAFT", "SENT", "COMPLETED"];
  if (current === "EXPIRED") return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">Kadaluarsa</span>;
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const idx = steps.indexOf(current);
        const isDone = idx > i, isCurrent = current === step;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDone ? "bg-green-50 text-green-700 border-green-200" : isCurrent ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
              {isDone ? "✓" : isCurrent ? "●" : "○"}
              <span className="ml-1">{step === "DRAFT" ? "Draft" : step === "SENT" ? "Terkirim" : "Selesai"}</span>
            </div>
            {i < steps.length - 1 && <span className="text-gray-300 text-xs mx-0.5">→</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editDays, setEditDays] = useState(7);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [questionsDirty, setQuestionsDirty] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState("");
  const [sendError, setSendError] = useState("");
  // Extend/close for SENT surveys
  const [showExtend, setShowExtend] = useState(false);
  const [extendDays, setExtendDays] = useState(7);
  const [extending, setExtending] = useState(false);
  const [closing, setClosing] = useState(false);
  // Recipients
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [recipientRows, setRecipientRows] = useState<{ name: string; email: string; company: string }[]>([{ name: "", email: "", company: "" }]);
  const [addingRecipients, setAddingRecipients] = useState(false);
  const [deletingRecipient, setDeletingRecipient] = useState<string | null>(null);
  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  // Email template modal
  const [emailPreviewRecipient, setEmailPreviewRecipient] = useState<Recipient | null>(null);

  const loadSurvey = useCallback(async () => {
    const [sRes, qRes, tRes, rRes] = await Promise.all([
      fetch(`/api/surveys/${id}/detail`).then(r => r.json()),
      fetch(`/api/surveys/${id}/questions`).then(r => r.json()),
      fetch(`/api/templates`).then(r => r.json()),
      fetch(`/api/surveys/${id}/recipients`).then(r => r.json()),
    ]);
    setSurvey(sRes);
    setEditNotes(sRes.notes || "");
    setQuestions(Array.isArray(qRes) ? qRes : []);
    setTemplates(Array.isArray(tRes) ? tRes : []);
    setRecipients(Array.isArray(rRes) ? rRes : []);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadSurvey(); }, [loadSurvey]);

  function addQuestion() {
    setQuestions(q => [...q, { type: "rating", label: "", required: true }]);
    setQuestionsDirty(true);
  }

  function updateQuestion(i: number, q: Question) {
    setQuestions(prev => prev.map((old, idx) => idx === i ? q : old));
    setQuestionsDirty(true);
  }

  function removeQuestion(i: number) {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
    setQuestionsDirty(true);
  }

  function moveQuestion(i: number, dir: -1 | 1) {
    setQuestions(prev => {
      const arr = [...prev];
      [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
      return arr;
    });
    setQuestionsDirty(true);
  }

  function loadTemplate(t: Template) {
    setQuestions(t.questions.map(q => ({ type: q.type, label: q.label, required: q.required, options: q.options })));
    setQuestionsDirty(true);
    setShowTemplates(false);
    setTemplateLoaded(`Template "${t.name}" dimuat — ${t.questions.length} pertanyaan`);
    setTimeout(() => setTemplateLoaded(""), 3000);
  }

  async function saveQuestions() {
    if (!questions.length) { setSendError("Tambahkan minimal 1 pertanyaan."); return; }
    const invalid = questions.find(q => !q.label.trim());
    if (invalid) { setSendError("Semua pertanyaan harus memiliki teks."); return; }
    setSaving(true);
    setSendError("");
    await fetch(`/api/surveys/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    setQuestionsDirty(false);
    setSaving(false);
  }

  async function handleSend() {
    if (!questions.length) { setSendError("Tambahkan minimal 1 pertanyaan sebelum mengirim."); return; }
    const invalid = questions.find(q => !q.label.trim());
    if (invalid) { setSendError("Semua pertanyaan harus memiliki teks."); return; }
    if (questionsDirty) await saveQuestions();
    if (!confirm("Kirim survei ini? Setelah dikirim, link akan aktif dan tidak bisa diedit lagi.")) return;
    setSending(true);
    setSendError("");
    await fetch(`/api/surveys/${id}/detail`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send" }),
    });
    await loadSurvey();
    setSending(false);
  }

  async function handleSaveEdit() {
    setSaving(true);
    await fetch(`/api/surveys/${id}/detail`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: editNotes, expiresInDays: editDays }),
    });
    await loadSurvey();
    setEditing(false);
    setSaving(false);
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName, questions }),
    });
    setTemplateName("");
    setShowSaveTemplate(false);
    await loadSurvey();
    setSavingTemplate(false);
  }

  async function handleClose() {
    if (!confirm("Tutup survei sekarang? Link akan langsung tidak aktif dan tidak bisa diisi lagi.")) return;
    setClosing(true);
    await fetch(`/api/surveys/${id}/detail`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    });
    await loadSurvey();
    setClosing(false);
  }

  async function handleExtend(e: React.FormEvent) {
    e.preventDefault();
    setExtending(true);
    await fetch(`/api/surveys/${id}/detail`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extend", expiresInDays: extendDays }),
    });
    await loadSurvey();
    setShowExtend(false);
    setExtending(false);
  }

  function copyLink() {
    if (!survey?.token) return;
    navigator.clipboard.writeText(`${window.location.origin}/survey/${survey.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAddRecipients(e: React.FormEvent) {
    e.preventDefault();
    const valid = recipientRows.filter(r => r.name.trim() || r.email.trim());
    if (!valid.length) return;
    setAddingRecipients(true);
    await fetch(`/api/surveys/${id}/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valid),
    });
    await loadSurvey();
    setShowAddRecipient(false);
    setRecipientRows([{ name: "", email: "", company: "" }]);
    setAddingRecipients(false);
  }

  async function handleDeleteRecipient(rid: string) {
    if (!confirm("Hapus penerima ini?")) return;
    setDeletingRecipient(rid);
    const res = await fetch(`/api/surveys/${id}/recipients/${rid}`, { method: "DELETE" });
    if (res.ok) {
      setRecipients(prev => prev.filter(r => r.id !== rid));
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Gagal menghapus penerima.");
    }
    setDeletingRecipient(null);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Memuat data...</div>;
  if (!survey || (survey as { error?: string }).error) return (
    <div className="text-center py-12 text-gray-400">
      Survei tidak ditemukan. <Link href="/dashboard/cs" className="text-indigo-600 hover:underline">Kembali</Link>
    </div>
  );

  const surveyUrl = survey.token ? `${window.location.origin}/survey/${survey.token}` : null;
  const isDraft = survey.status === "DRAFT";
  const isSent = survey.status === "SENT";
  const hasRecipients = recipients.length > 0;

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Kembali</button>
      </div>

      {/* Survey Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{survey.clientCompany}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{survey.projectName} · {survey.businessUnitName}</p>
            <p className="text-gray-400 text-xs mt-1">PM: {survey.projectManagerName || "—"} · Dibuat: {formatDate(survey.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[survey.status]}`}>{statusLabel[survey.status]}</span>
            {questions.length > 0 && (
              <button
                onClick={() => setShowPreview(true)}
                className="px-3 py-1 border border-gray-300 text-gray-600 rounded-full text-sm hover:bg-gray-50 transition"
              >
                👁 Preview
              </button>
            )}
          </div>
        </div>
        <StatusFlow current={survey.status} />
        {survey.notes && <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600"><span className="text-xs text-gray-400 font-medium">Catatan: </span>{survey.notes}</div>}

        {/* Edit info */}
        {isDraft && editing && (
          <div className="mt-4 border border-indigo-100 rounded-lg p-4 bg-indigo-50 space-y-3">
            <div className="text-sm font-medium text-indigo-700">Edit Info Survei</div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catatan Internal</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Perpanjang kadaluarsa (hari dari sekarang)</label>
              <input type="number" min={1} max={30} value={editDays} onChange={(e) => setEditDays(Number(e.target.value))}
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition">
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap mt-4">
          {isDraft && !editing && (
            <button onClick={() => setEditing(true)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              ✏ Edit Info
            </button>
          )}
          {isDraft && (() => {
            const recipientsWithEmail = recipients.filter(r => r.email && r.status !== "COMPLETED");
            const hasEmailRecipients = recipientsWithEmail.length > 0;
            return hasEmailRecipients ? (
              <button onClick={handleSend} disabled={sending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition">
                {sending ? "Mengaktifkan..." : `▶ Aktifkan & Kirim Email ke ${recipientsWithEmail.length} Penerima`}
              </button>
            ) : (
              <button onClick={handleSend} disabled={sending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition">
                {sending ? "Mengaktifkan..." : "▶ Aktifkan Link Umum"}
              </button>
            );
          })()}
          {(isSent || survey.status === "COMPLETED") && surveyUrl && !hasRecipients && (
            <button onClick={copyLink}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${copied ? "bg-green-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
              {copied ? "✓ Link Tersalin!" : "⧉ Salin Magic Link"}
            </button>
          )}
          {isSent && (
            <>
              {(() => {
                const pendingWithEmail = recipients.filter(r => r.email && r.status !== "COMPLETED");
                return pendingWithEmail.length > 0 ? (
                  <button
                    onClick={() => setEmailPreviewRecipient(pendingWithEmail[0])}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    ✉ Kirim Email ({pendingWithEmail.length})
                  </button>
                ) : null;
              })()}
              <button onClick={() => setShowExtend(!showExtend)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                Perpanjang
              </button>
              <button onClick={handleClose} disabled={closing}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition">
                {closing ? "Menutup..." : "Tutup Survei"}
              </button>
            </>
          )}
        </div>

        {sendError && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{sendError}</div>}

        {/* Extend form for SENT surveys */}
        {isSent && showExtend && (
          <form onSubmit={handleExtend} className="mt-3 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <span className="text-sm text-gray-600">Perpanjang</span>
            <input
              type="number" min={1} max={90} value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <span className="text-sm text-gray-600">hari dari sekarang</span>
            <button type="submit" disabled={extending}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition">
              {extending ? "Menyimpan..." : "Simpan"}
            </button>
            <button type="button" onClick={() => setShowExtend(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              Batal
            </button>
          </form>
        )}

        {(isSent || survey.status === "COMPLETED") && surveyUrl && !hasRecipients && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🌐</span>
              <div className="text-sm font-semibold text-blue-900">Survei Umum</div>
            </div>
            <div className="text-xs text-blue-700 mb-2">Magic Link untuk distribusi publik — dapat diisi berkali-kali oleh siapa saja</div>
            <code className="block text-xs text-blue-900 bg-white rounded px-3 py-2 break-all border border-blue-200">{surveyUrl}</code>
            <div className="text-xs text-blue-600 mt-2">
              Aktif hingga: {formatDate(survey.expiresAt)}
            </div>
          </div>
        )}
        {survey.status === "COMPLETED" && hasRecipients && surveyUrl && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-400 truncate font-mono">{surveyUrl}</div>
            <button onClick={copyLink}
              className={`text-xs px-2 py-1 rounded flex-shrink-0 transition ${copied ? "bg-green-100 text-green-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
              {copied ? "✓ Tersalin" : "Salin URL"}
            </button>
          </div>
        )}
        {isDraft && (
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
            {hasRecipients
              ? recipients.filter(r => r.email && r.status !== "COMPLETED").length > 0
                ? <>Draft belum aktif. Susun pertanyaan, lalu klik <strong>"Aktifkan & Kirim Email"</strong> untuk mengaktifkan dan mengirim undangan ke semua penerima.</>
                : <>Draft belum aktif. Sudah ada penerima terdaftar. Susun pertanyaan lalu aktifkan survei.</>
              : <>Draft belum aktif. Tambahkan penerima spesifik di bawah untuk survei per orang, atau susun pertanyaan lalu klik <strong>"Aktifkan Link"</strong> untuk survei umum.</>
            }
          </div>
        )}
      </div>

      {/* Question Builder — only for DRAFT */}
      {isDraft && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Pertanyaan Survei</h2>
              <p className="text-xs text-gray-400 mt-0.5">{questions.length} pertanyaan</p>
            </div>
            <div className="flex gap-2">
              {templates.length > 0 && (
                <button onClick={() => setShowTemplates(!showTemplates)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition">
                  Pakai Template
                </button>
              )}
              {questions.length > 0 && (
                <button onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition">
                  Simpan sebagai Template
                </button>
              )}
            </div>
          </div>

          {/* Template loaded toast */}
          {templateLoaded && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
              <span>✓</span> {templateLoaded} — edit sesuai kebutuhan, lalu simpan.
            </div>
          )}
          {showTemplates && (
            <div className="mb-4 border border-indigo-100 rounded-lg p-3 bg-indigo-50">
              <div className="text-xs font-medium text-indigo-700 mb-2">Pilih Template</div>
              <div className="space-y-2">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-white rounded-lg border border-indigo-100 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{t.name}</div>
                      {t.description && <div className="text-xs text-gray-400">{t.description}</div>}
                      <div className="text-xs text-gray-400">{t.questions.length} pertanyaan</div>
                    </div>
                    <button onClick={() => loadTemplate(t)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition">
                      Gunakan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save as template */}
          {showSaveTemplate && (
            <div className="mb-4 border border-green-100 rounded-lg p-3 bg-green-50 flex gap-2 items-center">
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nama template..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none" />
              <button onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-60 transition">
                {savingTemplate ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setShowSaveTemplate(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Batal</button>
            </div>
          )}

          {/* Questions list */}
          <div className="space-y-2 mb-4">
            {questions.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                Belum ada pertanyaan. Tambahkan pertanyaan atau pilih dari template.
              </div>
            )}
            {questions.map((q, i) => (
              <QuestionRow key={i} q={q} index={i} total={questions.length}
                onChange={updateQuestion} onRemove={removeQuestion} onMove={moveQuestion} />
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={addQuestion}
              className="px-4 py-2 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition">
              + Tambah Pertanyaan
            </button>
            {questionsDirty && questions.length > 0 && (
              <button onClick={saveQuestions} disabled={saving}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-60 transition">
                {saving ? "Menyimpan..." : "💾 Simpan Pertanyaan"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* View questions for non-draft */}
      {!isDraft && questions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Pertanyaan ({questions.length})</h2>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-400 font-medium mt-0.5 w-5">{i + 1}.</span>
                <div className="flex-1">
                  <div className="text-sm text-gray-800">{q.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{typeLabel[q.type]}{q.required ? " · Wajib" : " · Opsional"}</div>
                  {q.type === "select" && q.options && (
                    <div className="text-xs text-gray-400">Pilihan: {q.options}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipients Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Penerima Survei</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {recipients.length === 0
                ? "Tanpa daftar penerima — gunakan 1 link untuk semua"
                : `${recipients.length} penerima · ${recipients.filter(r => r.status === "COMPLETED").length} sudah mengisi`}
            </p>
          </div>
          {(isSent || isDraft) && (
            <button
              onClick={() => setShowAddRecipient(!showAddRecipient)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
            >
              + Tambah Penerima
            </button>
          )}
        </div>

        {/* Add recipients form */}
        {showAddRecipient && (
          <form onSubmit={handleAddRecipients} className="mb-4 border border-indigo-100 rounded-lg p-4 bg-indigo-50 space-y-3">
            <div className="text-xs font-semibold text-indigo-700 mb-1">Tambah Penerima — setiap penerima mendapat link unik yang tersembunyi</div>
            {recipientRows.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-center">
                <input
                  value={row.name}
                  onChange={(e) => setRecipientRows(prev => prev.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))}
                  placeholder="Nama kontak"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                />
                <input
                  value={row.company}
                  onChange={(e) => setRecipientRows(prev => prev.map((r, idx) => idx === i ? { ...r, company: e.target.value } : r))}
                  placeholder="Nama perusahaan"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => setRecipientRows(prev => prev.map((r, idx) => idx === i ? { ...r, email: e.target.value } : r))}
                    placeholder="Email"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                  {recipientRows.length > 1 && (
                    <button type="button" onClick={() => setRecipientRows(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600 px-2">✕</button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2 items-center">
              <button type="button"
                onClick={() => setRecipientRows(prev => [...prev, { name: "", email: "", company: "" }])}
                className="text-xs text-indigo-600 hover:underline font-medium">
                + Tambah baris
              </button>
              <span className="text-gray-300">·</span>
              <button type="submit" disabled={addingRecipients}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 transition">
                {addingRecipients ? "Menyimpan..." : "Simpan Penerima"}
              </button>
              <button type="button" onClick={() => { setShowAddRecipient(false); setRecipientRows([{ name: "", email: "", company: "" }]); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">
                Batal
              </button>
            </div>
          </form>
        )}

        {/* Recipients list */}
        {recipients.length === 0 ? (
          <div className="text-xs text-gray-400 py-2">
            {isSent
              ? "Belum ada penerima. Magic link umum aktif di atas. Tambahkan penerima untuk beralih ke mode per orang — magic link akan otomatis disembunyikan."
              : "Tambahkan penerima untuk survei per orang. Kosongkan untuk survei umum (magic link aktif setelah diaktifkan)."}
          </div>
        ) : (
          <div className="space-y-2">
            {recipients.map((r) => {
              const recipientUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/survey/${r.token}`;
              return (
                <div key={r.id} className={`px-4 py-3 rounded-lg border ${r.status === "COMPLETED" ? "bg-green-50 border-green-100" : "bg-white border-gray-200"}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{r.name || "—"}</span>
                        {r.company && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.company}</span>}
                        {r.email && <span className="text-xs text-gray-400">{r.email}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                        r.status === "EXPIRED" ? "bg-gray-100 text-gray-500" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {r.status === "COMPLETED" ? "Sudah Isi" : r.status === "EXPIRED" ? "Expired" : "Belum Isi"}
                      </span>
                      {r.status !== "COMPLETED" && r.email && (
                        <button
                          onClick={() => setEmailPreviewRecipient(r)}
                          className="text-xs px-2 py-0.5 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          Preview Email
                        </button>
                      )}
                      {r.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleDeleteRecipient(r.id)}
                          disabled={deletingRecipient === r.id}
                          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingRecipient === r.id ? "..." : "Hapus"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            <div className="pt-2 text-xs text-gray-500 flex gap-4">
              <span>Total: <strong>{recipients.length}</strong></span>
              <span>Sudah isi: <strong className="text-green-600">{recipients.filter(r => r.status === "COMPLETED").length}</strong></span>
              <span>Belum isi: <strong className="text-yellow-600">{recipients.filter(r => r.status === "PENDING").length}</strong></span>
              <span>Response rate: <strong>{recipients.length > 0 ? Math.round(recipients.filter(r => r.status === "COMPLETED").length / recipients.length * 100) : 0}%</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Responses */}
      <h2 className="text-base font-semibold text-gray-900 mb-3">Respons ({survey.responses.length})</h2>
      {survey.responses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
          {isDraft ? "Aktifkan survei terlebih dahulu." : isSent ? "Belum ada respons. Bagikan magic link ke klien." : "Tidak ada respons."}
        </div>
      ) : (
        <div className="space-y-4">
          {survey.responses.map((r) => {
            const answers: Record<string, string> = r.answers ? JSON.parse(r.answers) : {};
            const ratingScores = questions
              .map((q, i) => q.type === "rating" ? Number(answers[String(i)]) : null)
              .filter((v): v is number => v !== null && !isNaN(v));
            const avgScore = ratingScores.length > 0
              ? ratingScores.reduce((a, b) => a + b, 0) / ratingScores.length : null;
            const npsVal = questions.findIndex(q => q.type === "nps");
            const npsScore = npsVal >= 0 ? Number(answers[String(npsVal)]) : r.nps;
            const isRisk = (avgScore !== null && avgScore <= 2) || (npsScore !== null && npsScore <= 6);

            return (
              <div key={r.id} className={`bg-white rounded-xl border p-5 ${isRisk ? "border-red-200" : "border-gray-200"}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {isRisk && <span className="text-red-500 text-sm">⚠</span>}
                      <span className="font-semibold text-gray-900">{r.respondentName || "Anonim"}</span>
                      {r.respondentEmail && <span className="text-xs text-gray-400">{r.respondentEmail}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(r.submittedAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {avgScore !== null && (
                      <div className="text-right">
                        <div className={`text-lg font-bold ${avgScore <= 2 ? "text-red-600" : avgScore >= 4 ? "text-green-600" : "text-yellow-600"}`}>
                          {avgScore.toFixed(1)}<span className="text-xs font-normal text-gray-400">/5</span>
                        </div>
                        <div className="text-xs text-gray-400">rata-rata</div>
                      </div>
                    )}
                    {npsScore !== null && !isNaN(npsScore) && (
                      <div className="text-right">
                        <div className={`text-lg font-bold ${npsScore <= 6 ? "text-red-600" : npsScore >= 9 ? "text-green-600" : "text-yellow-600"}`}>
                          {npsScore}<span className="text-xs font-normal text-gray-400">/10</span>
                        </div>
                        <div className="text-xs text-gray-400">NPS</div>
                      </div>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${followUpColor[r.followUpStatus]}`}>
                      {r.followUpStatus.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Per-question answers */}
                {Object.keys(answers).length > 0 ? (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    {questions.map((q, i) => {
                      const val = answers[String(i)];
                      if (!val) return null;
                      const numVal = Number(val);
                      const isLow = q.type === "rating" && numVal <= 2;
                      const isHigh = q.type === "rating" && numVal >= 4;
                      const isNpsLow = q.type === "nps" && numVal <= 6;
                      const isNpsHigh = q.type === "nps" && numVal >= 9;

                      return (
                        <div key={i} className={`rounded-lg p-3 ${isLow || isNpsLow ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-500 mb-1">
                                <span className="font-medium text-gray-600">{i + 1}.</span> {q.label}
                              </div>

                              {/* Rating: show score bar */}
                              {q.type === "rating" && (
                                <div className="flex items-center gap-3">
                                  <div className="flex gap-1">
                                    {[1,2,3,4,5].map(s => (
                                      <div key={s} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold border-2 ${
                                        s <= numVal
                                          ? numVal <= 2 ? "bg-red-500 border-red-500 text-white"
                                          : numVal <= 3 ? "bg-yellow-400 border-yellow-400 text-white"
                                          : "bg-green-500 border-green-500 text-white"
                                          : "border-gray-200 text-gray-300"
                                      }`}>{s}</div>
                                    ))}
                                  </div>
                                  <span className={`text-sm font-bold ${isLow ? "text-red-600" : isHigh ? "text-green-600" : "text-yellow-600"}`}>
                                    {val}/5 {isLow ? "— Rendah" : isHigh ? "— Tinggi" : "— Sedang"}
                                  </span>
                                </div>
                              )}

                              {/* NPS: show colored score */}
                              {q.type === "nps" && (
                                <div className="flex items-center gap-3">
                                  <div className="flex gap-0.5">
                                    {[0,1,2,3,4,5,6,7,8,9,10].map(s => (
                                      <div key={s} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                                        s === numVal
                                          ? numVal <= 6 ? "bg-red-500 text-white"
                                          : numVal <= 8 ? "bg-yellow-400 text-white"
                                          : "bg-green-500 text-white"
                                          : "bg-gray-100 text-gray-400"
                                      }`}>{s}</div>
                                    ))}
                                  </div>
                                  <span className={`text-sm font-bold ${isNpsLow ? "text-red-600" : isNpsHigh ? "text-green-600" : "text-yellow-600"}`}>
                                    {isNpsLow ? "Detractor" : numVal <= 8 ? "Passive" : "Promoter"}
                                  </span>
                                </div>
                              )}

                              {/* Select: show badge */}
                              {q.type === "select" && (
                                <span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700 font-medium">
                                  {val}
                                </span>
                              )}

                              {/* Text: show full answer */}
                              {q.type === "text" && (
                                <div className="text-sm text-gray-700 bg-white rounded border border-gray-200 px-3 py-2 italic">
                                  "{val}"
                                </div>
                              )}
                            </div>

                            {isLow && (
                              <span className="flex-shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Perlu Perhatian</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 space-y-1 border-t border-gray-100 pt-3">
                    {r.scoreOverall !== null && <div>Skor Overall: <strong>{r.scoreOverall}/5</strong></div>}
                    {r.nps !== null && <div>NPS: <strong>{r.nps}</strong></div>}
                    {r.comments && <div className="bg-gray-50 rounded-lg px-3 py-2 italic text-gray-600">"{r.comments}"</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Survey Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-gray-50 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 bg-white rounded-t-2xl border-b border-gray-200">
              <div>
                <div className="font-semibold text-gray-900">Preview Survei</div>
                <div className="text-xs text-gray-400 mt-0.5">Tampilan persis seperti yang dilihat klien</div>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-700 text-xl font-bold px-2">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Identity section */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Identitas</h2>
                <p className="text-xs text-gray-400 mb-4">Wajib diisi agar feedback Anda dapat ditindaklanjuti</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Nama <span className="text-red-500">*</span></label>
                    <input disabled placeholder="Nama Anda" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                    <input disabled placeholder="email@perusahaan.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Perusahaan</label>
                    <input disabled placeholder="Nama perusahaan Anda" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400" />
                  </div>
                </div>
              </div>
              {/* Questions */}
              {questions.map((q, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="mb-4">
                    <span className="text-xs text-gray-400">Pertanyaan {i + 1}</span>
                    {q.required && <span className="text-red-400 ml-1 text-xs">*</span>}
                    <h3 className="font-semibold text-gray-900 mt-1">{q.label || <span className="text-gray-300 italic">Teks pertanyaan...</span>}</h3>
                  </div>
                  {q.type === "rating" && (
                    <div>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(s => (
                          <div key={s} className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-sm text-gray-400 font-semibold">{s}</div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-2 px-1"><span>Sangat Buruk</span><span>Sangat Baik</span></div>
                    </div>
                  )}
                  {q.type === "nps" && (
                    <div>
                      <div className="flex gap-1.5">
                        {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                          <div key={n} className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold text-center ${n <= 6 ? "border-red-100 text-red-300" : n <= 8 ? "border-yellow-100 text-yellow-400" : "border-green-100 text-green-400"}`}>{n}</div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-2 px-1"><span>Tidak mungkin</span><span>Sangat mungkin</span></div>
                    </div>
                  )}
                  {q.type === "text" && (
                    <textarea disabled rows={3} placeholder="Tuliskan jawaban Anda..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 resize-none" />
                  )}
                  {(q.type === "select" || q.type === "multiselect") && q.options && (
                    <div className="space-y-2">
                      {q.options.split(",").map(opt => opt.trim()).filter(Boolean).map(opt => (
                        <div key={opt} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-gray-100 text-sm text-gray-500">{opt}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button disabled className="w-full bg-indigo-200 text-white font-semibold py-4 rounded-2xl text-base cursor-not-allowed">
                Kirim Penilaian
              </button>
              <p className="text-center text-xs text-gray-400 pb-2">Preview — tidak bisa disubmit</p>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Modal */}
      {emailPreviewRecipient && survey && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <div className="font-semibold text-gray-900">Preview Template Email</div>
                <div className="text-xs text-gray-400 mt-0.5">Kepada: {emailPreviewRecipient.name} · {emailPreviewRecipient.email}</div>
              </div>
              <button onClick={() => setEmailPreviewRecipient(null)} className="text-gray-400 hover:text-gray-700 text-xl font-bold px-2">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              {/* Email preview */}
              <div className="border border-gray-200 rounded-xl overflow-hidden text-sm">
                {/* Email header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 space-y-1">
                  <div className="flex gap-2"><span className="text-gray-400 w-12 flex-shrink-0">Dari:</span><span className="text-gray-700">Provaliant Client Experience &lt;noreply@provaliantgroup.com&gt;</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-12 flex-shrink-0">Kepada:</span><span className="text-gray-700">{emailPreviewRecipient.name}{emailPreviewRecipient.email ? ` <${emailPreviewRecipient.email}>` : ""}</span></div>
                  {emailPreviewRecipient.company && <div className="flex gap-2"><span className="text-gray-400 w-12 flex-shrink-0">Instansi:</span><span className="text-gray-700">{emailPreviewRecipient.company}</span></div>}
                  <div className="flex gap-2"><span className="text-gray-400 w-12 flex-shrink-0">Subjek:</span><span className="text-gray-700 font-medium">Undangan Survei Kepuasan Klien — {survey.clientCompany}</span></div>
                </div>
                {/* Email body */}
                <div className="p-5 space-y-4 text-gray-700 leading-relaxed">
                  <p>Yth. Bapak/Ibu <strong>{emailPreviewRecipient.name}</strong>{emailPreviewRecipient.company ? <> dari <strong>{emailPreviewRecipient.company}</strong></> : ""},</p>
                  <p>Terima kasih atas kepercayaan Anda dalam menggunakan layanan <strong>Provaliant</strong> untuk proyek <strong>{survey.projectName}</strong>.</p>
                  <p>Kami ingin mendapatkan masukan dan penilaian Anda mengenai kualitas layanan yang telah kami berikan. Penilaian Anda sangat berharga bagi kami untuk terus meningkatkan standar layanan.</p>
                  <p>Silakan klik tombol di bawah ini untuk mengisi survei. Proses pengisian hanya membutuhkan waktu <strong>2–3 menit</strong>.</p>
                  <div className="text-center py-2">
                    <div className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-sm cursor-not-allowed opacity-80">
                      Isi Survei Sekarang →
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Link bersifat personal dan hanya dapat digunakan oleh Anda</p>
                  </div>
                  <p>Jika tombol di atas tidak berfungsi, link survei Anda akan dikirimkan secara terpisah oleh tim kami.</p>
                  <p>Hormat kami,<br /><strong>Tim Provaliant Client Experience</strong></p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <div className="text-xs text-gray-400 flex-1 pt-1">
                  {isDraft ? "⚠ Survey masih Draft — akan diaktifkan otomatis saat kirim email" : "* Kirim email akan dikonfigurasi terpisah"}
                </div>
                <button
                  onClick={() => setEmailPreviewRecipient(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Tutup
                </button>
                <button
                  onClick={async () => {
                    if (isDraft) {
                      if (!confirm("Survey masih Draft. Aktifkan survey sekarang dan kirim email?")) return;
                      setSending(true);
                      await fetch(`/api/surveys/${id}/detail`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "send" }),
                      });
                      await loadSurvey();
                    }
                    setSending(true);
                    const res = await fetch(`/api/surveys/${id}/send-email`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ recipientId: emailPreviewRecipient?.id }),
                    });
                    const data = await res.json();
                    setSending(false);
                    if (res.ok && data.successCount > 0) {
                      alert(`Email berhasil dikirim ke ${emailPreviewRecipient?.name}.`);
                    } else {
                      alert(`Gagal kirim email: ${data.error || data.results?.[0]?.error || "Unknown error"}`);
                    }
                    setEmailPreviewRecipient(null);
                  }}
                  disabled={sending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition"
                >
                  {sending ? "Mengirim..." : isDraft ? "Aktifkan & Kirim Email" : "Kirim Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
