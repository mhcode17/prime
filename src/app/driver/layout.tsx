import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { MobileNav } from "@/components/shell/mobile-nav";
import {
  NotificationFab,
  type FabNotification,
} from "@/components/shell/notification-fab";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("DRIVER");
  const driver = await prisma.driver.findUnique({
    where: { userId: session.userId },
    select: { id: true, companyId: true, company: { select: { name: true } } },
  });

  // Notification counts for the floating button.
  let notifications: FabNotification[] = [];
  if (driver) {
    const [unreadMessages, docsToSign] = await Promise.all([
      prisma.message.count({
        where: {
          conversation: { driverId: driver.id, companyId: driver.companyId },
          readAt: null,
          sender: { role: { in: ["COMPANY", "ADMIN"] } },
        },
      }),
      prisma.documentAssignment.count({
        where: { driverId: driver.id, status: { in: ["SENT", "VIEWED"] } },
      }),
    ]);
    notifications = [
      {
        kind: "messages",
        label: unreadMessages === 1 ? "1 new message" : `${unreadMessages} new messages`,
        href: "/driver/messages",
        count: unreadMessages,
      },
      {
        kind: "documents",
        label: docsToSign === 1 ? "1 document to sign" : `${docsToSign} documents to sign`,
        href: "/driver/documents",
        count: docsToSign,
      },
    ];
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="DRIVER" />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          role="DRIVER"
          name={session.name}
          email={session.email}
          subtitle={driver?.company?.name}
        />
        <Topbar
          name={session.name}
          email={session.email}
          subtitle={driver?.company?.name}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
      <NotificationFab notifications={notifications} />
    </div>
  );
}
