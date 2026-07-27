import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";
import { getOrCreateConversation } from "@/lib/messaging";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { ChatThread } from "@/components/chat/thread";
import { DriverComposer } from "./composer";

export default async function DriverMessagesPage() {
  const { driver, session } = await getCurrentDriver();

  const convo = await getOrCreateConversation(driver.companyId, driver.id);

  // Mark company messages as read
  await prisma.message.updateMany({
    where: {
      conversationId: convo.id,
      readAt: null,
      sender: { role: { in: ["COMPANY", "ADMIN"] } },
    },
    data: { readAt: new Date() },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "asc" },
    include: { sender: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Messages"
        description={`Chat with ${driver.company.name}.`}
      />

      <Card className="flex h-[70vh] flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <ChatThread
            messages={messages.map((m) => ({
              id: m.id,
              body: m.body,
              createdAt: m.createdAt,
              senderId: m.senderId,
              senderName:
                m.sender.role === "DRIVER"
                  ? `${m.sender.firstName} ${m.sender.lastName}`
                  : driver.company.name,
            }))}
            currentUserId={session.userId}
            emptyLabel="No messages yet. Send a message to your company."
          />
        </div>
        <DriverComposer />
      </Card>
    </div>
  );
}
