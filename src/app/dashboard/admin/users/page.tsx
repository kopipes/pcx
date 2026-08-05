"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  businessUnitId: string | null;
  businessUnitName: string | null;
  createdAt: string;
}

const ROLES = ["CS", "PM", "BU_HEAD", "DIRECTOR", "ADMIN"];

type EditForm = { name: string; email: string; role: string; businessUnitId: string; password: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [businessUnits, setBusinessUnits] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "CS", businessUnitId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", email: "", role: "", businessUnitId: "", password: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const [u, bu] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/business-units").then((r) => r.json()),
    ]);
    setUsers(u);
    setBusinessUnits(bu);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (!res.ok) { setError((await res.json()).error); setSaving(false); return; }
    await load();
    setShowForm(false);
    setAddForm({ name: "", email: "", password: "", role: "CS", businessUnitId: "" });
    setSaving(false);
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setEditForm({ name: u.name, email: u.email, role: u.role, businessUnitId: u.businessUnitId || "", password: "" });
    setError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    const body: Record<string, string> = {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
      businessUnitId: editForm.businessUnitId,
    };
    if (editForm.password) body.password = editForm.password;
    const res = await fetch(`/api/users/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { setError((await res.json()).error); setSaving(false); return; }
    await load();
    setEditingId(null);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus user ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || "Gagal menghapus user");
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
    setDeletingId(null);
  }

  const InputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Users</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} pengguna terdaftar</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + Tambah User
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Tambah User Baru</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
              <input required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className={InputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className={InputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} className={InputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })} className={InputCls}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Business Unit</label>
              <select value={addForm.businessUnitId} onChange={(e) => setAddForm({ ...addForm, businessUnitId: e.target.value })} className={InputCls}>
                <option value="">— Tidak ada —</option>
                {businessUnits.map((bu) => <option key={bu.id} value={bu.id}>{bu.name}</option>)}</select></div>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Business Unit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bergabung</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <>
                  <tr key={u.id} className={`hover:bg-gray-50 ${editingId === u.id ? "bg-indigo-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{u.role}</span></td>
                    <td className="px-4 py-3 text-gray-500">{u.businessUnitName || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => editingId === u.id ? setEditingId(null) : startEdit(u)}
                          className="text-xs text-indigo-600 hover:underline font-medium">
                          {editingId === u.id ? "Batal" : "Edit"}</button>
                        <button onClick={() => handleDelete(u.id)} disabled={deletingId === u.id}
                          className="text-xs text-red-500 hover:underline font-medium disabled:opacity-50">
                          {deletingId === u.id ? "..." : "Hapus"}</button>
                      </div>
                    </td>
                  </tr>
                  {editingId === u.id && (
                    <tr key={`edit-${u.id}`}>
                      <td colSpan={6} className="px-4 py-4 bg-indigo-50 border-b border-indigo-100">
                        <form onSubmit={handleEdit} className="space-y-3">
                          <div className="text-xs font-semibold text-indigo-700 mb-2">Edit User: {u.name}</div>
                          <div className="grid grid-cols-3 gap-3">
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Nama</label>
                              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={InputCls} /></div>
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={InputCls} /></div>
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className={InputCls}>
                                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Business Unit</label>
                              <select value={editForm.businessUnitId} onChange={(e) => setEditForm({ ...editForm, businessUnitId: e.target.value })} className={InputCls}>
                                <option value="">— Tidak ada —</option>
                                {businessUnits.map((bu) => <option key={bu.id} value={bu.id}>{bu.name}</option>)}</select></div>
                            <div><label className="block text-xs font-medium text-gray-600 mb-1">Password Baru (opsional)</label>
                              <input type="password" placeholder="Kosongkan jika tidak diubah" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className={InputCls} /></div>
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
