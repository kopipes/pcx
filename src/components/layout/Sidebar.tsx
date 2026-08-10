"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type NavItem = { label: string; href: string };
type NavSection = { section: string; icon: string; items: NavItem[] };

const navByRole: Record<string, NavSection[]> = {
  CS: [
    { section: "Survei", icon: "📋", items: [
      { label: "Daftar Survei", href: "/dashboard/cs" },
      { label: "Buat Survei", href: "/dashboard/cs/create" },
      { label: "Respons", href: "/dashboard/cs/responses" },
    ]},
  ],
  PM: [
    { section: "Follow-up", icon: "✅", items: [
      { label: "Proyek Saya", href: "/dashboard/pm" },
      { label: "Detail Follow-up", href: "/dashboard/pm/followups" },
    ]},
  ],
  BU_HEAD: [
    { section: "Analitik", icon: "📊", items: [
      { label: "Analitik BU", href: "/dashboard/bu" },
    ]},
    { section: "Proyek", icon: "📁", items: [
      { label: "Proyek BU", href: "/dashboard/bu/projects" },
    ]},
    { section: "Follow-up", icon: "✅", items: [
      { label: "Follow-up BU", href: "/dashboard/bu/followups" },
    ]},
  ],
  DIRECTOR: [
    { section: "Analitik", icon: "📊", items: [
      { label: "Ringkasan Eksekutif", href: "/dashboard/director" },
    ]},
  ],
  ADMIN: [
    { section: "Administrasi", icon: "⚙️", items: [
      { label: "Dashboard Admin", href: "/dashboard/admin" },
      { label: "Users", href: "/dashboard/admin/users" },
      { label: "Business Units", href: "/dashboard/admin/business-units" },
      { label: "Proyek", href: "/dashboard/admin/projects" },
    ]},
    { section: "Survei", icon: "📋", items: [
      { label: "Daftar Survei", href: "/dashboard/cs" },
      { label: "Buat Survei", href: "/dashboard/cs/create" },
      { label: "Respons", href: "/dashboard/cs/responses" },
    ]},
    { section: "Follow-up", icon: "✅", items: [
      { label: "Proyek & Follow-up", href: "/dashboard/pm" },
      { label: "Detail Follow-up", href: "/dashboard/pm/followups" },
    ]},
    { section: "Analitik", icon: "📊", items: [
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

function CollapsibleSection({
  section,
  pathname,
  forceOpen,
  onNavClick,
}: {
  section: NavSection;
  pathname: string;
  forceOpen: boolean;
  onNavClick?: () => void;
}) {
  const hasActive = section.items.some(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );
  const [open, setOpen] = useState(hasActive || forceOpen);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition
          ${hasActive ? "text-indigo-700 bg-indigo-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
      >
        <span className="flex items-center gap-2">
          <span>{section.icon}</span>
          <span>{section.section}</span>
        </span>
        <span className={`text-xs transition-transform duration-200 ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5 pl-2">
          {section.items.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition
                  ${active
                    ? "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-500"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-2 border-transparent"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role || "";
  const roles = session?.user?.roles || [role];

  const seenSections = new Set<string>();
  const sections: NavSection[] = [];
  for (const r of roles) {
    const roleSections = navByRole[r] || [];
    for (const section of roleSections) {
      if (!seenSections.has(section.section)) {
        seenSections.add(section.section);
        sections.push(section);
      }
    }
  }

  const alwaysOpen = sections.length === 1;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">P</div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Provaliant PCX</div>
            <div className="text-xs text-gray-400">{roleLabel[role] || role}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.section}
            section={section}
            pathname={pathname}
            forceOpen={alwaysOpen}
            onNavClick={onNavClick}
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="px-3 py-1">
          <div className="text-sm text-gray-700 font-medium truncate">{session?.user?.name}</div>
          <div className="text-xs text-gray-400 truncate mt-0.5">{session?.user?.email}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm"
        aria-label="Buka menu"
      >
        <span className="text-gray-600 text-lg leading-none">☰</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed top-0 left-0 z-50 w-72 h-full bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-sm">Menu</span>
          <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl font-bold px-2">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent onNavClick={() => setMobileOpen(false)} />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 min-h-screen bg-white border-r border-gray-200 flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
