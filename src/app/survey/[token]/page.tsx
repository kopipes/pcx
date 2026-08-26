"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Question {
  id: string;
  type: "rating" | "nps" | "text" | "select" | "multiselect" | "header";
  label: string;
  required: boolean;
  options?: string | null;
  sortOrder: number;
}

export default function SurveyPage() {
  const { token } = useParams<{ token: string }>();

  const [status, setStatus] = useState<"loading" | "valid" | "completed" | "expired" | "draft" | "error">("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [respondentCompany, setRespondentCompany] = useState("");
  const [recipientName, setRecipientName] = useState<string | null>(null); // pre-filled from recipient list
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/surveys/token/${token}`)
      .then(async (r) => {
        if (r.status === 410) {
          const d = await r.json();
          if (d.error === "Already completed") setStatus("completed");
          else if (d.error === "Survey not yet active") setStatus("draft");
          else setStatus("expired");
          return;
        }
        if (!r.ok) { setStatus("error"); return; }
        const d = await r.json();
        setQuestions(d.questions || []);
        if (d.recipientName) setRecipientName(d.recipientName);
        setStatus("valid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  function setAnswer(index: number, value: string) {
    setAnswers(prev => ({ ...prev, [String(index)]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate required questions (skip headers)
    let qIndex = 0;
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].type === "header") continue;
      if (questions[i].required && !answers[String(i)]) {
        setError(`Pertanyaan ${++qIndex} wajib diisi.`);
        return;
      }
      qIndex++;
    }

    setSubmitting(true);
    const res = await fetch(`/api/surveys/token/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, respondentName, respondentEmail, respondentCompany }),
    });

    if (res.ok) {
      setSubmitted(true);
    } else {
      const d = await res.json();
      setError(d.error || "Terjadi kesalahan, silakan coba lagi.");
    }
    setSubmitting(false);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-gray-500 text-sm">Memuat survei...</div>
      </div>
    );
  }

  if (status === "completed") return <StatusScreen icon="✓" color="green" title="Survei Sudah Diisi" message="Terima kasih! Anda sudah mengisi survei ini sebelumnya." />;
  if (status === "expired") return <StatusScreen icon="⏱" color="gray" title="Survei Kadaluarsa" message="Link survei ini sudah tidak aktif. Silakan hubungi tim kami." />;
  if (status === "draft") return <StatusScreen icon="⚙" color="gray" title="Survei Belum Aktif" message="Survei ini belum dikirimkan oleh tim. Silakan tunggu atau hubungi Customer Service." />;
  if (status === "error") return <StatusScreen icon="✕" color="red" title="Survei Tidak Ditemukan" message="Link survei tidak valid. Pastikan Anda menggunakan link yang benar." />;

  if (submitted) return <StatusScreen icon="✓" color="green" title="Terima Kasih!" message="Feedback Anda telah berhasil kami terima. Penilaian Anda sangat membantu kami untuk terus meningkatkan layanan." />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white text-2xl font-bold mb-4">P</div>
          <h1 className="text-2xl font-bold text-gray-900">Survei Kepuasan Klien</h1>
          <p className="text-gray-500 text-sm mt-2">Provaliant Client Experience — Penilaian Anda sangat berarti bagi kami</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Respondent Identity — hidden if recipient is known, required if anonymous */}
          {recipientName ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  {recipientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Halo, {recipientName}!</div>
                  <div className="text-xs text-gray-400">Survei ini dikirimkan khusus untuk Anda</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Identitas</h2>
              <p className="text-xs text-gray-400 mb-4">Wajib diisi agar feedback Anda dapat ditindaklanjuti</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nama <span className="text-red-500">*</span></label>
                  <input required value={respondentName} onChange={(e) => setRespondentName(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-400 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" required value={respondentEmail} onChange={(e) => setRespondentEmail(e.target.value)}
                    placeholder="email@perusahaan.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-400 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Perusahaan</label>
                  <input value={respondentCompany} onChange={(e) => setRespondentCompany(e.target.value)}
                    placeholder="Nama perusahaan Anda"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-400 outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Questions */}
          {questions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center text-gray-400 text-sm">
              Survei ini belum memiliki pertanyaan.
            </div>
          ) : (() => {
              let qNum = 0;
              return questions.map((q, i) => {
                if (q.type === "header") {
                  return (
                    <div key={q.id} className="pt-2">
                      <div className="border-b-2 border-indigo-300 pb-2">
                        <h2 className="text-base font-bold text-indigo-700">{q.label}</h2>
                      </div>
                    </div>
                  );
                }
                const qN = ++qNum;
                return (
              <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-4">
                   <span className="text-xs text-gray-500 font-medium">Pertanyaan {qN}</span>
                  {q.required && <span className="text-red-500 ml-1 text-xs">*</span>}
                  <h3 className="font-semibold text-gray-900 mt-1 text-base">{q.label}</h3>
                </div>

                {/* Rating 1–5 — smaller circles */}
                {q.type === "rating" && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div key={s} className="flex flex-col items-center gap-1">
                        <button type="button" onClick={() => setAnswer(i, String(s))}
                          className={`w-10 h-10 rounded-full text-sm font-semibold border-2 transition flex items-center justify-center ${
                            answers[String(i)] === String(s)
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600"
                          }`}
                          aria-label={`Skor ${s}`}
                        >
                          {s}
                        </button>
                        {s === 1 && <span className="text-xs text-gray-400 whitespace-nowrap">{q.options === "scale:yesno" ? "Tidak" : "Sangat Buruk"}</span>}
                        {s === 3 && <span className="text-xs text-gray-400 whitespace-nowrap">Netral</span>}
                        {s === 5 && <span className="text-xs text-gray-400 whitespace-nowrap">{q.options === "scale:yesno" ? "Ya" : "Sangat Baik"}</span>}
                        {(s === 2 || s === 4) && <span className="text-xs text-transparent select-none">.</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* NPS 0–10 */}
                {q.type === "nps" && (
                  <div>
                    <div className="flex gap-1.5">
                      {[0,1,2,3,4,5,6,7,8,9,10].map((n) => {
                        const selected = answers[String(i)] === String(n);
                        const color = n <= 6 ? "hover:border-red-300" : n <= 8 ? "hover:border-yellow-300" : "hover:border-green-300";
                        const selColor = n <= 6 ? "bg-red-500 border-red-500 text-white" : n <= 8 ? "bg-yellow-500 border-yellow-500 text-white" : "bg-green-500 border-green-500 text-white";
                        return (
                          <button key={n} type="button" onClick={() => setAnswer(i, String(n))}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition ${selected ? selColor : `border-gray-200 text-gray-700 ${color}`}`}
                            aria-label={`NPS ${n}`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                      <span>Tidak mungkin</span><span>Sangat mungkin</span>
                    </div>
                  </div>
                )}

                {/* Text */}
                {q.type === "text" && (
                  <textarea value={answers[String(i)] || ""} onChange={(e) => setAnswer(i, e.target.value)}
                    rows={3} placeholder="Tuliskan jawaban Anda..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-400 outline-none resize-none" />
                )}

                {/* Select — single choice */}
                {q.type === "select" && q.options && (
                  <div className="space-y-2">
                    {q.options.split(",").map((opt) => opt.trim()).filter(Boolean).map((opt) => (
                      <label key={opt} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition ${
                        answers[String(i)] === opt ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
                      }`}>
                        <input type="radio" name={`q-${i}`} value={opt} checked={answers[String(i)] === opt}
                          onChange={() => setAnswer(i, opt)} className="text-indigo-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                    {/* Lainnya option */}
                    <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition ${
                      answers[String(i)] !== "" && !q.options!.split(",").map(o => o.trim()).includes(answers[String(i)])
                        ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
                    }`}>
                      <input type="radio" name={`q-${i}`} value="__lainnya__"
                        checked={answers[String(i)] !== "" && !q.options!.split(",").map(o => o.trim()).includes(answers[String(i)])}
                        onChange={() => setAnswer(i, "__lainnya__")} className="text-indigo-600" />
                      <span className="text-sm text-gray-700">Lainnya</span>
                    </label>
                    {answers[String(i)] !== "" && !q.options!.split(",").map(o => o.trim()).includes(answers[String(i)]) && (
                      <input
                        autoFocus
                        value={answers[String(i)] === "__lainnya__" ? "" : answers[String(i)]}
                        onChange={(e) => setAnswer(i, e.target.value || "__lainnya__")}
                        placeholder="Tuliskan jawaban Anda..."
                        className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                      />
                    )}
                  </div>
                )}

                {/* Multiselect — multiple choices */}
                {q.type === "multiselect" && q.options && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-1">Pilih satu atau lebih jawaban</p>
                    {q.options.split(",").map((opt) => opt.trim()).filter(Boolean).map((opt) => {
                      const selected = (answers[String(i)] || "").split("||").map(s => s.trim()).filter(Boolean).includes(opt);
                      return (
                        <label key={opt} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition ${
                          selected ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
                        }`}>
                          <input type="checkbox" value={opt} checked={selected}
                            onChange={(e) => {
                              const current = (answers[String(i)] || "").split("||").map(s => s.trim()).filter(Boolean);
                              const updated = e.target.checked
                                ? [...current, opt]
                                : current.filter(v => v !== opt);
                              setAnswer(i, updated.join(" || "));
                            }} className="text-indigo-600 rounded" />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      );
                    })}
                    {/* Lainnya option */}
                    {(() => {
                      const parts = (answers[String(i)] || "").split("||").map(s => s.trim()).filter(Boolean);
                      const knownOpts = q.options!.split(",").map(o => o.trim()).filter(Boolean);
                      const lainnyaVal = parts.find(p => !knownOpts.includes(p));
                      const lainnyaChecked = !!lainnyaVal;
                      return (
                        <>
                          <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition ${
                            lainnyaChecked ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
                          }`}>
                            <input type="checkbox" checked={lainnyaChecked}
                              onChange={(e) => {
                                const current = parts.filter(p => knownOpts.includes(p));
                                if (e.target.checked) {
                                  setAnswer(i, [...current, "__lainnya__"].join(" || "));
                                } else {
                                  setAnswer(i, current.join(" || "));
                                }
                              }} className="text-indigo-600 rounded" />
                            <span className="text-sm text-gray-700">Lainnya</span>
                          </label>
                          {lainnyaChecked && (
                            <input
                              autoFocus
                              value={lainnyaVal === "__lainnya__" ? "" : (lainnyaVal || "")}
                              onChange={(e) => {
                                const current = parts.filter(p => knownOpts.includes(p));
                                setAnswer(i, [...current, e.target.value || "__lainnya__"].join(" || "));
                              }}
                              placeholder="Tuliskan jawaban Anda..."
                              className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
                );
              });
            })()}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          {/* Cara Mengisi */}
          {(() => {
            const types = new Set(questions.filter(q => q.type !== "header").map(q => q.type));
            const guides: { type: string; title: string; desc: string }[] = [
              { type: "rating", title: "Rating (1–5)", desc: "Pilih angka yang mewakili penilaian Anda. 1 = Sangat Buruk, 5 = Sangat Baik." },
              { type: "nps", title: "NPS (0–10)", desc: "Seberapa besar kemungkinan Anda merekomendasikan kami. 0–6 = Tidak merekomendasikan, 7–8 = Netral, 9–10 = Sangat merekomendasikan." },
              { type: "text", title: "Teks Bebas", desc: "Tuliskan masukan, saran, atau komentar Anda secara langsung." },
              { type: "select", title: "Pilihan Ganda", desc: "Pilih salah satu opsi yang paling sesuai dengan kondisi Anda." },
              { type: "multiselect", title: "Pilihan Berganda", desc: "Pilih satu atau lebih opsi yang sesuai dengan kondisi Anda." },
            ].filter(g => types.has(g.type as Question["type"]));
            if (!guides.length) return null;
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="text-sm font-semibold text-gray-700 mb-3">Panduan Pengisian</div>
                <div className="space-y-2 text-xs text-gray-500">
                  {guides.map((g, idx) => (
                    <div key={g.type} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{idx + 1}</span>
                      <span><strong className="text-gray-700">{g.title}</strong> — {g.desc}</span>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-gray-100 text-gray-400">
                    Pertanyaan bertanda <span className="text-red-400 font-bold">*</span> wajib diisi sebelum mengirim.
                  </div>
                </div>
              </div>
            );
          })()}

          <button type="submit" disabled={submitting || questions.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-4 rounded-2xl text-base transition shadow-lg">
            {submitting ? "Mengirim..." : "Kirim Penilaian"}
          </button>

          <p className="text-center text-xs text-gray-400 pb-4">
            Data Anda terlindungi dan hanya digunakan untuk meningkatkan kualitas layanan Provaliant.
          </p>
        </form>
      </div>
    </div>
  );
}

function StatusScreen({ icon, color, title, message }: { icon: string; color: string; title: string; message: string }) {
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-3xl mb-4 ${colors[color]}`}>{icon}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  );
}
