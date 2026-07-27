"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import type { FieldType } from "@prisma/client";

export interface FieldInput {
  type: FieldType;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string | null;
  required?: boolean;
}

export async function saveFields(documentId: string, fields: FieldInput[]) {
  const { companyId } = await getCurrentCompany("documents");

  const doc = await prisma.document.findFirst({
    where: { id: documentId, companyId },
    include: { assignments: { select: { status: true } } },
  });
  if (!doc) throw new Error("Document not found");

  // Don't allow editing the layout once anyone has signed.
  const hasSigned = doc.assignments.some((a) => a.status === "SIGNED");
  if (hasSigned) throw new Error("Cannot edit fields after a driver has signed");

  await prisma.$transaction([
    prisma.documentField.deleteMany({ where: { documentId } }),
    prisma.documentField.createMany({
      data: fields.map((f) => ({
        documentId,
        type: f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        w: f.w,
        h: f.h,
        label: f.label ?? null,
        required: f.required ?? true,
      })),
    }),
  ]);

  revalidatePath(`/company/documents/${documentId}`);
  revalidatePath(`/company/documents/${documentId}/fields`);
}
