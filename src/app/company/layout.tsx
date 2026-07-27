import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { MobileNav } from "@/components/shell/mobile-nav";
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
  const session = await requireRole("COMPANY");
  const [company, user] = await Promise.all([
    session.companyId
      ? prisma.company.findUnique({
          where: { id: session.companyId },
          select: { name: true, status: true },
        })
      : null,
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { companyRole: true, permissions: true },
    }),
  ]);
  const isOwner = user?.companyRole === "OWNER";
  const canMessages = isOwner || (user?.permissions ?? []).includes("messages");

  // Floating notification: unread messages from drivers.
  let notifications: FabNotification[] = [];
  if (company && canMessages) {
    const unread = await prisma.message.count({
      where: {
        conversation: { companyId: session.companyId! },
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="COMPANY" permissions={user?.permissions ?? []} isOwner={isOwner} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          role="COMPANY"
          permissions={user?.permissions ?? []}
          isOwner={isOwner}
          name={session.name}
          email={session.email}
          subtitle={company?.name}
        />
        <Topbar
          name={session.name}
          email={session.email}
          subtitle={company?.name}
        />
        {company?.status && company.status !== "ACTIVE" && (
          <div className="border-b border-yellow-200 bg-yellow-50 px-6 py-2 text-sm text-yellow-800">
            Your company is{" "}
            <Badge tone={statusTone(company.status)}>
              {humanize(company.status)}
            </Badge>{" "}
            — some features are limited until an admin approves your account.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
      <NotificationFab notifications={notifications} />
    </div>
  );
}
