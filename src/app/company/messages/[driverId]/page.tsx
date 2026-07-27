import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { getOrCreateConversation } from "@/lib/messaging";
import { Card } from "@/components/ui/card";
import { ChatThread } from "@/components/chat/thread";
import { CompanyComposer } from "../composer";
import { Badge, humanize, statusTone } from "@/components/ui/badge";

export default async function CompanyConversationPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;
  const { companyId, session } = await getCurrentCompany("messages");

  const driver = await prisma.driver.findFirst({
    where: { id: driverId, companyId },
    include: { user: true },
  });
  if (!driver) notFound();

  const convo = await getOrCreateConversation(companyId, driverId);

  // Mark driver messages as read
  await prisma.message.updateMany({
    where: { conversationId: convo.id, readAt: null, sender: { role: "DRIVER" } },
    data: { readAt: new Date() },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "asc" },
    include: { sender: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/company/messages" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← All conversations
      </Link>

      <Card className="flex h-[70vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <Link href={`/company/drivers/${driver.id}`} className="font-medium text-slate-900 hover:text-brand-600">
            {driver.user.firstName} {driver.user.lastName}
          </Link>
          <Badge tone={statusTone(driver.status)}>{humanize(driver.status)}</Badge>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ChatThread
            messages={messages.map((m) => ({
              id: m.id,
              body: m.body,
              createdAt: m.createdAt,
              senderId: m.senderId,
              senderName: `${m.sender.firstName} ${m.sender.lastName}`,
            }))}
            currentUserId={session.userId}
          />
        </div>

        <CompanyComposer driverId={driver.id} />
      </Card>
    </div>
  );
}
