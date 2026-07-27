import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { CompanySwitcher } from "@/components/shell/company-switcher";
import {
  NotificationFab,
  type FabNotification,
} from "@/components/shell/notification-fab";
import { Badge, humanize, statusTone } from "@/components/ui/badge";

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentCompany();
  const { session, company, companyId, isOwner, isOrgAdmin, permissions } = ctx;
  const canMessages = ctx.can("messages");

  // Floating notification: unread messages from drivers (active company).
  let notifications: FabNotification[] = [];
  if (canMessages) {
    const unread = await prisma.message.count({
      where: {
        conversation: { companyId },
        readAt: null,
        sender: { role: "DRIVER" },
      },
    });
    notifications = [
      {
        kind: "messages",
        label: unread === 1 ? "1 new message" : `${unread} new messages`,
        href: "/company/messages",
        count: unread,
      },
    ];
  }

  const switcher = (
    <CompanySwitcher companies={ctx.accessibleCompanies} activeId={companyId} />
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        role="COMPANY"
        permissions={permissions}
        isOwner={isOwner}
        isOrgAdmin={isOrgAdmin}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          role="COMPANY"
          permissions={permissions}
          isOwner={isOwner}
          isOrgAdmin={isOrgAdmin}
          name={session.name}
          email={session.email}
          subtitle={company.name}
        />
        <Topbar name={session.name} email={session.email} subtitle={switcher} />
        {company.status !== "ACTIVE" && (
          <div className="border-b border-yellow-200 bg-yellow-50 px-6 py-2 text-sm text-yellow-800">
            This company is{" "}
            <Badge tone={statusTone(company.status)}>
              {humanize(company.status)}
            </Badge>{" "}
            — some features are limited until an admin approves the account.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
      <NotificationFab notifications={notifications} />
    </div>
  );
}
