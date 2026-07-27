import { requireRole } from "@/lib/auth/guards";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { MobileNav } from "@/components/shell/mobile-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("ADMIN");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="ADMIN" />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          role="ADMIN"
          name={session.name}
          email={session.email}
          subtitle="Platform administration"
        />
        <Topbar
          name={session.name}
          email={session.email}
          subtitle="Platform administration"
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
