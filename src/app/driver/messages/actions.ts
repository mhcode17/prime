"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";
import { getOrCreateConversation } from "@/lib/messaging";

export async function sendDriverMessage(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const { driver, session } = await getCurrentDriver();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Message is empty" };

  const convo = await getOrCreateConversation(driver.companyId, driver.id);
  await prisma.message.create({
    data: { conversationId: convo.id, senderId: session.userId, body },
  });
  await prisma.conversation.update({
    where: { id: convo.id },
    data: { updatedAt: new Date() },
  });

  revalidatePath("/driver/messages");
  return undefined;
}
