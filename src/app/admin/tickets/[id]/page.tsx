import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { TicketThread } from "@/components/support/ticket-thread";
import { AdminReplyForm, TicketStatusControls } from "../ticket-ui";

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/tickets" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← All tickets
      </Link>
      <PageHeader
        title={ticket.subject}
        description={ticket.company.name}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(ticket.priority)}>{humanize(ticket.priority)}</Badge>
            <Badge tone={statusTone(ticket.status)}>{humanize(ticket.status)}</Badge>
            <TicketStatusControls ticketId={ticket.id} status={ticket.status} />
          </div>
        }
      />

      <Card className="flex h-[65vh] flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <TicketThread
            viewerIsAdmin={true}
            messages={ticket.messages.map((m) => ({
              id: m.id,
              body: m.body,
              fromAdmin: m.fromAdmin,
              senderName: `${m.sender.firstName} ${m.sender.lastName}`,
              createdAt: m.createdAt,
            }))}
          />
        </div>
        <AdminReplyForm ticketId={ticket.id} />
      </Card>
    </div>
  );
}
