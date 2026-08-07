"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

interface Project {
  id: string;
  clientCompany: string;
  projectName: string;
  businessUnitId: string | null;
  businessUnitName: string | null;
  projectManagerId: string | null;
  projectManagerName: string | null;
  createdAt: string;
}

export default function BuProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pms, setPms] = useState<{ id: string; name: string; businessUnitId: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addForm, setAddForm] = useState({ clientCompany: "", projectName: "", projectManagerId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [p, u] = await Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]);
    setProjects(Array.isArray(p) ? p : []);
    setPms(Array.isArray(u) ? u.filter((x: { role: string }) => x.role === "PM") : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (!res.ok) {
      setError((await res.json()).error || "Gagal membuat proyek.");
      setSaving(false);
      return;
    }
    await load();
    setShowForm(false);
    setAddForm({ clientCompany: "", projectName: "", projectManagerId: "" });
    setSaving(false);
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyek BU</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola proyek dalam Business Unit Anda</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
        >
          + Tambah Proyek
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Proyek Baru</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan Klien <span className="text-red-500">*</span></label>
              <input
                required
                value={addForm.clientCompany}
                onChange={(e) => setAddForm(f => ({ ...f, clientCompany: e.target.value }))}
                placeholder="PT Contoh Indonesia"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Proyek <span className="text-red-500">*</span></label>
              <input
                required
                value={addForm.projectName}
                onChange={(e) => setAddForm(f => ({ ...f, projectName: e.target.value }))}
                placeholder="Website Redesign 2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
              <select
                value={addForm.projectManagerId}
                onChange={(e) => setAddForm(f => ({ ...f, projectManagerId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              >
                <option value="">— Pilih PM (opsional) —</option>
                {pms.map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition">
              {saving ? "Menyimpan..." : "Simpan Proyek"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(""); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              Batal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          Belum ada proyek. Klik "Tambah Proyek" untuk membuat proyek pertama.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Perusahaan Klien</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Nama Proyek</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">PM</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.clientCompany}</td>
                  <td className="px-4 py-3 text-gray-600">{p.projectName}</td>
                  <td className="px-4 py-3 text-gray-500">{p.projectManagerName || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
