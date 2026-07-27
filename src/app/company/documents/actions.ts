"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";

const MAX_FILE = 8 * 1024 * 1024; // 8MB

export async function createDocument(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { companyId, session } = await getCurrentCompany("documents");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const file = formData.get("file");

  if (!title) return { error: "Title is required" };

  let content = body || null;
  let fileName: string | null = null;
  let fileType: string | null = body ? "text/plain" : null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE) return { error: "File must be under 8MB" };
    const buf = Buffer.from(await file.arrayBuffer());
    content = `data:${file.type};base64,${buf.toString("base64")}`;
    fileName = file.name;
    fileType = file.type;
  }

  if (!content) return { error: "Provide document text or upload a file" };

  await prisma.document.create({
    data: {
      companyId,
      title,
      description: description || null,
      content,
      fileName,
      fileType,
      uploadedById: session.userId,
    },
  });
  revalidatePath("/company/documents");
  return { ok: true };
}

const sendSchema = z.object({
  documentId: z.string(),
  driverIds: z.array(z.string()).min(1, "Select at least one driver"),
});

export async function sendDocument(documentId: string, driverIds: string[]) {
  const { companyId } = await getCurrentCompany("documents");
  const parsed = sendSchema.safeParse({ documentId, driverIds });
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const doc = await prisma.document.findFirst({
    where: { id: documentId, companyId },
  });
  if (!doc) throw new Error("Document not found");

  // Only assign to drivers that belong to this company
  const validDrivers = await prisma.driver.findMany({
    where: { id: { in: driverIds }, companyId },
    select: { id: true },
  });

  for (const d of validDrivers) {
    await prisma.documentAssignment.upsert({
      where: { documentId_driverId: { documentId, driverId: d.id } },
      update: {},
      create: { documentId, driverId: d.id, status: "SENT" },
    });
  }
  revalidatePath("/company/documents");
  revalidatePath(`/company/documents/${documentId}`);
}

export async function voidAssignment(assignmentId: string) {
  const { companyId } = await getCurrentCompany("documents");
  const a = await prisma.documentAssignment.findFirst({
    where: { id: assignmentId, document: { companyId } },
  });
  if (!a) throw new Error("Not found");
  await prisma.documentAssignment.update({
    where: { id: assignmentId },
    data: { status: "VOIDED" },
  });
  revalidatePath(`/company/documents/${a.documentId}`);
}
