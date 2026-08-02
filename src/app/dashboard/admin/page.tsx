"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  users: number;
  projects: number;
  surveys: number;
  responses: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, projects: 0, surveys: 0, responses: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/surveys").then((r) => r.json()),
      fetch("/api/responses").then((r) => r.json()),
    ]).then(([users, projects, surveys, responses]) => {
      setStats({
        users: Array.isArray(users) ? users.length : 0,
        projects: Array.isArray(projects) ? projects.length : 0,
        surveys: Array.isArray(surveys) ? surveys.length : 0,
        responses: Array.isArray(responses) ? responses.length : 0,
      });
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">System Administration</h1>
      <p className="text-gray-500 text-sm mb-6">Manajemen sistem Provaliant PCX</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2 w-16" />
              <div className="h-4 bg-gray-100 rounded w-24" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Users" value={stats.users} href="/dashboard/admin/users" />
            <StatCard label="Proyek" value={stats.projects} href="/dashboard/admin/projects" />
            <StatCard label="Survei" value={stats.surveys} href="#" />
            <StatCard label="Respons" value={stats.responses} href="#" />
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AdminLink href="/dashboard/admin/users" title="Manajemen Users" desc="Tambah, edit, dan kelola akun pengguna" />
        <AdminLink href="/dashboard/admin/business-units" title="Business Units" desc="Kelola unit bisnis Provaliant" />
        <AdminLink href="/dashboard/admin/projects" title="Proyek" desc="Tambah dan kelola proyek klien" />
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition">
      <div className="text-3xl font-bold text-indigo-600">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </Link>
  );
}

function AdminLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition">
      <div className="font-semibold text-gray-900 mb-1">{title}</div>
      <div className="text-sm text-gray-500">{desc}</div>
    </Link>
  );
}
