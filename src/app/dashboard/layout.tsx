import { requireAuth } from "@/lib/session";
import Sidebar from "@/components/layout/Sidebar";
import Providers from "@/components/Providers";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <Providers>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-4 lg:py-8 pt-16 lg:pt-8">{children}</div>
        </main>
      </div>
    </Providers>
  );
}
