"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import type { TicketPriority } from "@prisma/client";

const createSchema = z.object({
  subject: z.string().min(3, "Subject is required"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  body: z.string().min(1, "Describe your issue"),
});

export async function createTicket(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { companyId, session } = await getCurrentCompany();
  const parsed = createSchema.safeParse({
    subject: formData.get("subject"),
    priority: formData.get("priority"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  await prisma.supportTicket.create({
    data: {
      companyId,
      createdById: session.userId,
      subject: d.subject,
      priority: d.priority as TicketPriority,
      status: "OPEN",
      messages: {
        create: { senderId: session.userId, body: d.body, fromAdmin: false },
      },
    },
  });
  revalidatePath("/company/support");
  return { ok: true };
}

export async function replyTicket(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const { companyId, session } = await getCurrentCompany();
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Message is empty" };

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, companyId },
  });
  if (!ticket) return { error: "Ticket not found" };
  if (ticket.status === "CLOSED") return { error: "This ticket is closed" };

  await prisma.supportTicketMessage.create({
    data: { ticketId, senderId: session.userId, body, fromAdmin: false },
  });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "OPEN", updatedAt: new Date() },
  });
  revalidatePath(`/company/support/${ticketId}`);
  revalidatePath("/company/support");
  return undefined;
}
