import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { TicketThread } from "@/components/support/ticket-thread";
import { TicketReplyForm } from "../support-ui";

export default async function CompanyTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await getCurrentCompany();

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, companyId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/company/support" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← All tickets
      </Link>
      <PageHeader
        title={ticket.subject}
        actions={
          <div className="flex gap-2">
            <Badge tone={statusTone(ticket.priority)}>{humanize(ticket.priority)}</Badge>
            <Badge tone={statusTone(ticket.status)}>{humanize(ticket.status)}</Badge>
          </div>
        }
      />

      <Card className="flex h-[65vh] flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <TicketThread
            viewerIsAdmin={false}
            messages={ticket.messages.map((m) => ({
              id: m.id,
              body: m.body,
              fromAdmin: m.fromAdmin,
              senderName: `${m.sender.firstName} ${m.sender.lastName}`,
              createdAt: m.createdAt,
            }))}
          />
        </div>
        {ticket.status !== "CLOSED" ? (
          <TicketReplyForm ticketId={ticket.id} />
        ) : (
          <div className="border-t border-slate-200 p-3 text-center text-sm text-slate-400">
            This ticket is closed.
          </div>
        )}
      </Card>
    </div>
  );
}
