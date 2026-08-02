"use client";

import { useEffect, useState } from "react";

interface BU { id: string; name: string; code: string; }

export default function AdminBUPage() {
  const [bus, setBus] = useState<BU[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", code: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", code: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const data = await fetch("/api/business-units").then((r) => r.json());
    setBus(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/business-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (!res.ok) { setError((await res.json()).error || "Gagal"); setSaving(false); return; }
    await load();
    setShowForm(false);
    setAddForm({ name: "", code: "" });
    setSaving(false);
  }

  function startEdit(bu: BU) {
    setEditingId(bu.id);
    setEditForm({ name: bu.name, code: bu.code });
    setError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/business-units/${editingId}`, {
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
    if (!confirm("Hapus Business Unit ini? Pastikan tidak ada proyek atau user yang terhubung.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/business-units/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert((await res.json()).error || "Gagal menghapus Business Unit");
    } else {
      setBus((prev) => prev.filter((b) => b.id !== id));
    }
    setDeletingId(null);
  }

  const InputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Units</h1>
          <p className="text-gray-500 text-sm mt-1">{bus.length} unit bisnis</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Tambah BU
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Tambah Business Unit</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
              <input required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className={InputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Kode (singkatan)</label>
              <input required value={addForm.code} onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                placeholder="mis. TECH" className={InputCls} /></div>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bus.map((bu) => (
                <>
                  <tr key={bu.id} className={`hover:bg-gray-50 ${editingId === bu.id ? "bg-indigo-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{bu.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">{bu.code}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => editingId === bu.id ? setEditingId(null) : startEdit(bu)}
                          className="text-xs text-indigo-600 hover:underline font-medium">
                          {editingId === bu.id ? "Batal" : "Edit"}</button>
                        <button onClick={() => handleDelete(bu.id)} disabled={deletingId === bu.id}
                          className="text-xs text-red-500 hover:underline font-medium disabled:opacity-50">
                          {deletingId === bu.id ? "..." : "Hapus"}</button>
                      </div>
                    </td>
                  </tr>
                  {editingId === bu.id && (
                    <tr key={`edit-${bu.id}`}>
                      <td colSpan={3} className="px-4 py-4 bg-indigo-50 border-b border-indigo-100">
                        <form onSubmit={handleEdit} className="space-y-3">
                          <div className="text-xs font-semibold text-indigo-700 mb-2">Edit Business Unit: {bu.name}</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Nama</label>
                              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={InputCls} /></div>
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Kode</label>
                              <input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })} className={InputCls} /></div>
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
