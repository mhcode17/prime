import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initials, formatDateTime } from "@/lib/utils";
import { StartConversation } from "./start-conversation";

export default async function CompanyMessagesPage() {
  const { companyId } = await getCurrentCompany("messages");

  const conversations = await prisma.conversation.findMany({
    where: { companyId, messages: { some: {} } },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Resolve drivers + unread counts
  const driverIds = conversations.map((c) => c.driverId);
  const drivers = await prisma.driver.findMany({
    where: { id: { in: driverIds } },
    include: { user: true },
  });
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  const unread = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversation: { companyId },
      readAt: null,
      sender: { role: "DRIVER" },
    },
    _count: true,
  });
  const unreadMap = new Map(unread.map((u) => [u.conversationId, u._count]));

  const activeDrivers = await prisma.driver.findMany({
    where: { companyId, status: { not: "TERMINATED" } },
    include: { user: true },
    orderBy: { user: { firstName: "asc" } },
  });
  const driverOpts = activeDrivers.map((d) => ({
    id: d.id,
    name: `${d.user.firstName} ${d.user.lastName}`,
  }));

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Conversations with your drivers."
        actions={<StartConversation drivers={driverOpts} />}
      />

      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Use “Start chat with driver” above to message any driver."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-slate-100 p-0">
            {conversations.map((c) => {
              const d = driverMap.get(c.driverId);
              if (!d) return null;
              const last = c.messages[0];
              const count = unreadMap.get(c.id) ?? 0;
              return (
                <Link
                  key={c.id}
                  href={`/company/messages/${c.driverId}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {initials(d.user.firstName, d.user.lastName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">
                        {d.user.firstName} {d.user.lastName}
                      </span>
                      <span className="text-xs text-slate-400">
                        {last ? formatDateTime(last.createdAt) : ""}
                      </span>
                    </div>
                    <div className="truncate text-sm text-slate-500">{last?.body}</div>
                  </div>
                  {count > 0 && <Badge tone="blue">{count}</Badge>}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
