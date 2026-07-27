import "server-only";
import { prisma } from "@/lib/db";

/** Get or create the single conversation between a company and a driver. */
export async function getOrCreateConversation(companyId: string, driverId: string) {
  return prisma.conversation.upsert({
    where: { companyId_driverId: { companyId, driverId } },
    update: {},
    create: { companyId, driverId },
  });
}
