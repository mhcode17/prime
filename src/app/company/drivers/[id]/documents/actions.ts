"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";

/**
 * Remove a document from a driver's Documents list.
 * - For auto-filed verification records (generated per driver), the whole
 *   Document is deleted and the experience back-link is cleared so it can be
 *   re-added later.
 * - For regular templates sent to the driver, only this driver's assignment is
 *   removed (the shared template stays available for other drivers).
 */
export async function deleteDriverDocument(
  assignmentId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { companyId } = await getCurrentCompany("documents");

  const a = await prisma.documentAssignment.findFirst({
    where: { id: assignmentId, document: { companyId } },
    include: { document: { select: { id: true, kind: true } } },
  });
  if (!a) return { error: "Document not found" };

  const linkedExp = await prisma.driverExperience.findFirst({
    where: { verificationDocumentId: a.documentId },
    select: { id: true },
  });
  const isVerification = a.document.kind === "VERIFICATION" || !!linkedExp;

  if (isVerification) {
    await prisma.driverExperience.updateMany({
      where: { verificationDocumentId: a.documentId },
      data: { verificationDocumentId: null },
    });
    await prisma.document.delete({ where: { id: a.documentId } });
  } else {
    await prisma.documentAssignment.delete({ where: { id: a.id } });
  }

  revalidatePath(`/company/drivers/${a.driverId}`);
  revalidatePath(`/company/drivers/${a.driverId}/documents`);
  return { ok: true };
}
