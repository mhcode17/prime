import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { TicketStatus } from "@prisma/client";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status as TicketStatus | undefined;

  const tickets = await prisma.supportTicket.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      company: { select: { name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { messages: true } },
    },
  });

  const tabs: { label: string; value?: TicketStatus }[] = [
    { label: "All" },
    { label: "Open", value: "OPEN" },
    { label: "Pending", value: "PENDING" },
    { label: "Resolved", value: "RESOLVED" },
    { label: "Closed", value: "CLOSED" },
  ];

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description="Requests from companies across the platform."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = filter === t.value || (!filter && !t.value);
          return (
            <Link
              key={t.label}
              href={t.value ? `/admin/tickets?status=${t.value}` : "/admin/tickets"}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                active ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="No tickets" description="No support tickets match this filter." />
      ) : (
        <Card>
          <CardContent className="divide-y divide-slate-100 p-0">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tickets/${t.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium text-slate-900">{t.subject}</div>
                  <div className="text-xs text-slate-500">
                    {t.company.name} · {t.createdBy.firstName} {t.createdBy.lastName} ·{" "}
                    {t._count.messages} message(s) · Updated {formatDateTime(t.updatedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(t.priority)}>{humanize(t.priority)}</Badge>
                  <Badge tone={statusTone(t.status)}>{humanize(t.status)}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
