"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import type { TicketStatus } from "@prisma/client";

export async function replyAdminTicket(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const session = await requireRole("ADMIN");
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Message is empty" };

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "Ticket not found" };

  await prisma.supportTicketMessage.create({
    data: { ticketId, senderId: session.userId, body, fromAdmin: true },
  });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "PENDING", updatedAt: new Date() },
  });
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return undefined;
}

export async function setTicketStatus(ticketId: string, status: TicketStatus) {
  await requireRole("ADMIN");
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
}
