"use client";

import { useEffect, useState } from "react";

interface Project {
  id: string;
  clientCompany: string;
  projectName: string;
  businessUnitId: string | null;
  businessUnitName: string | null;
  projectManagerId: string | null;
  projectManagerName: string | null;
}

type EditForm = { clientCompany: string; projectName: string; businessUnitId: string; projectManagerId: string };

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [bus, setBus] = useState<{ id: string; name: string }[]>([]);
  const [pms, setPms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addForm, setAddForm] = useState({ clientCompany: "", projectName: "", businessUnitId: "", projectManagerId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ clientCompany: "", projectName: "", businessUnitId: "", projectManagerId: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const [p, bu, u] = await Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/business-units").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]);
    setProjects(p);
    setBus(bu);
    setPms(u.filter((x: { role: string }) => x.role === "PM"));
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
    if (!res.ok) { setError((await res.json()).error || "Gagal"); setSaving(false); return; }
    await load();
    setShowForm(false);
    setAddForm({ clientCompany: "", projectName: "", businessUnitId: "", projectManagerId: "" });
    setSaving(false);
  }

  function startEdit(p: Project) {
    setEditingId(p.id);
    setEditForm({
      clientCompany: p.clientCompany,
      projectName: p.projectName,
      businessUnitId: p.businessUnitId || "",
      projectManagerId: p.projectManagerId || "",
    });
    setError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/projects/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (!res.ok) { setError((await res.json()).error || "Gagal"); setSaving(false); return; }
    await load();
    setEditingId(null);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus proyek ini? Pastikan tidak ada survei yang terhubung.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert((await res.json()).error || "Gagal menghapus proyek");
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
    setDeletingId(null);
  }

  const InputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm";
  const SelectCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Proyek</h1>
          <p className="text-gray-500 text-sm mt-1">{projects.length} proyek</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Tambah Proyek
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Tambah Proyek Baru</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Perusahaan Klien</label>
              <input required value={addForm.clientCompany} onChange={(e) => setAddForm({ ...addForm, clientCompany: e.target.value })} className={InputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Proyek</label>
              <input required value={addForm.projectName} onChange={(e) => setAddForm({ ...addForm, projectName: e.target.value })} className={InputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Business Unit</label>
              <select required value={addForm.businessUnitId} onChange={(e) => setAddForm({ ...addForm, businessUnitId: e.target.value })} className={SelectCls}>
                <option value="">-- Pilih BU --</option>
                {bus.map((bu) => <option key={bu.id} value={bu.id}>{bu.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
              <select value={addForm.projectManagerId} onChange={(e) => setAddForm({ ...addForm, projectManagerId: e.target.value })} className={SelectCls}>
                <option value="">— Belum ditentukan —</option>
                {pms.map((pm) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}</select></div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition">
              {saving ? "Menyimpan..." : "Simpan"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Batal</button>
          </div>
        </form>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Memuat data...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Klien</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proyek</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Business Unit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">PM</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p) => (
                <>
                  <tr key={p.id} className={`hover:bg-gray-50 ${editingId === p.id ? "bg-indigo-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.clientCompany}</td>
                    <td className="px-4 py-3 text-gray-600">{p.projectName}</td>
                    <td className="px-4 py-3 text-gray-500">{p.businessUnitName || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{p.projectManagerName || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => editingId === p.id ? setEditingId(null) : startEdit(p)}
                          className="text-xs text-indigo-600 hover:underline font-medium">
                          {editingId === p.id ? "Batal" : "Edit"}</button>
                        <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                          className="text-xs text-red-500 hover:underline font-medium disabled:opacity-50">
                          {deletingId === p.id ? "..." : "Hapus"}</button>
                      </div>
                    </td>
                  </tr>
                  {editingId === p.id && (
                    <tr key={`edit-${p.id}`}>
                      <td colSpan={5} className="px-4 py-4 bg-indigo-50 border-b border-indigo-100">
                        <form onSubmit={handleEdit} className="space-y-3">
                          <div className="text-xs font-semibold text-indigo-700 mb-2">Edit Proyek: {p.projectName}</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Perusahaan Klien</label>
                              <input value={editForm.clientCompany} onChange={(e) => setEditForm({ ...editForm, clientCompany: e.target.value })} className={InputCls} /></div>
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Nama Proyek</label>
                              <input value={editForm.projectName} onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })} className={InputCls} /></div>
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Business Unit</label>
                              <select value={editForm.businessUnitId} onChange={(e) => setEditForm({ ...editForm, businessUnitId: e.target.value })} className={SelectCls}>
                                <option value="">-- Pilih BU --</option>
                                {bus.map((bu) => <option key={bu.id} value={bu.id}>{bu.name}</option>)}</select></div>
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Project Manager</label>
                              <select value={editForm.projectManagerId} onChange={(e) => setEditForm({ ...editForm, projectManagerId: e.target.value })} className={SelectCls}>
                                <option value="">— Belum ditentukan —</option>
                                {pms.map((pm) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}</select></div>
                          </div>
                          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">{error}</div>}
                          <div className="flex gap-2">
                            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 transition">
                              {saving ? "Menyimpan..." : "Simpan Perubahan"}</button>
                            <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Batal</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
