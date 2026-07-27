"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { getOrCreateConversation } from "@/lib/messaging";

export async function sendCompanyMessage(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const { companyId, session } = await getCurrentCompany("messages");
  const driverId = String(formData.get("driverId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Message is empty" };

  const driver = await prisma.driver.findFirst({ where: { id: driverId, companyId } });
  if (!driver) return { error: "Driver not found" };

  const convo = await getOrCreateConversation(companyId, driverId);
  await prisma.message.create({
    data: { conversationId: convo.id, senderId: session.userId, body },
  });
  await prisma.conversation.update({
    where: { id: convo.id },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/company/messages/${driverId}`);
  revalidatePath("/company/messages");
  return undefined;
}

/** Mark all driver-sent messages in this conversation as read by the company. */
export async function markCompanyRead(driverId: string) {
  const { companyId } = await getCurrentCompany("messages");
  const convo = await prisma.conversation.findUnique({
    where: { companyId_driverId: { companyId, driverId } },
  });
  if (!convo) return;
  await prisma.message.updateMany({
    where: {
      conversationId: convo.id,
      readAt: null,
      sender: { role: "DRIVER" },
    },
    data: { readAt: new Date() },
  });
}
