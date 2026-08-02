"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavSection = { section: string; items: { label: string; href: string }[] };

const navByRole: Record<string, NavSection[]> = {
  CS: [
    { section: "Survei", items: [
      { label: "Daftar Survei", href: "/dashboard/cs" },
      { label: "Buat Survei", href: "/dashboard/cs/create" },
      { label: "Respons", href: "/dashboard/cs/responses" },
    ]},
  ],
  PM: [
    { section: "Project Manager", items: [
      { label: "Proyek Saya", href: "/dashboard/pm" },
      { label: "Follow-up", href: "/dashboard/pm/followups" },
    ]},
  ],
  BU_HEAD: [
    { section: "Business Unit", items: [
      { label: "Analitik BU", href: "/dashboard/bu" },
      { label: "Follow-up", href: "/dashboard/bu/followups" },
    ]},
  ],
  DIRECTOR: [
    { section: "Eksekutif", items: [
      { label: "Ringkasan Eksekutif", href: "/dashboard/director" },
    ]},
  ],
  ADMIN: [
    { section: "Administrasi", items: [
      { label: "Dashboard Admin", href: "/dashboard/admin" },
      { label: "Users", href: "/dashboard/admin/users" },
      { label: "Business Units", href: "/dashboard/admin/business-units" },
      { label: "Proyek", href: "/dashboard/admin/projects" },
    ]},
    { section: "Survei (CS)", items: [
      { label: "Daftar Survei", href: "/dashboard/cs" },
      { label: "Buat Survei", href: "/dashboard/cs/create" },
      { label: "Respons", href: "/dashboard/cs/responses" },
    ]},
    { section: "Follow-up (PM)", items: [
      { label: "Proyek & Follow-up", href: "/dashboard/pm" },
      { label: "Detail Follow-up", href: "/dashboard/pm/followups" },
    ]},
    { section: "Analitik", items: [
      { label: "Analitik BU", href: "/dashboard/bu" },
      { label: "Follow-up BU", href: "/dashboard/bu/followups" },
      { label: "Ringkasan Eksekutif", href: "/dashboard/director" },
    ]},
  ],
};

const roleLabel: Record<string, string> = {
  CS: "Customer Service",
  PM: "Project Manager",
  BU_HEAD: "BU Head",
  DIRECTOR: "Director",
  ADMIN: "Admin",
};

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role || "";
  const sections = navByRole[role] || [];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">P</div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Provaliant PCX</div>
            <div className="text-xs text-gray-400">{roleLabel[role] || role}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.section} className="mb-4">
            {sections.length > 1 && (
              <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.section}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition ${
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="px-3 py-2 text-sm text-gray-600 font-medium truncate">{session?.user?.name}</div>
        <div className="px-3 py-1 text-xs text-gray-400 truncate mb-2">{session?.user?.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          Keluar
        </button>
      </div>
    </aside>
  );
}
