"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";
import {
  resolveAutoField,
  isAutoField,
  isSignatureField,
  type FieldType,
  type SignerData,
} from "@/lib/fields";
import { generateSignedPdf, type PlacedField, type ResolvedValue } from "@/lib/pdf/generate";

async function assertOwnAssignment(assignmentId: string) {
  const { driver } = await getCurrentDriver();
  const a = await prisma.documentAssignment.findFirst({
    where: { id: assignmentId, driverId: driver.id },
  });
  if (!a) throw new Error("Document not found");
  return a;
}

export async function markViewed(assignmentId: string) {
  const a = await assertOwnAssignment(assignmentId);
  if (a.status === "SENT") {
    await prisma.documentAssignment.update({
      where: { id: assignmentId },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
    revalidatePath(`/driver/documents/${assignmentId}`);
  }
}

export async function signDocument(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const signedName = String(formData.get("signedName") ?? "").trim();
  const signatureData = String(formData.get("signatureData") ?? "").trim();
  const consent = formData.get("consent");

  const a = await assertOwnAssignment(assignmentId);
  if (a.status === "SIGNED") return { error: "Already signed" };
  if (a.status === "VOIDED") return { error: "This document was voided by the company" };
  if (!signedName) return { error: "Type your full legal name to sign" };
  if (!consent) return { error: "You must agree to sign electronically" };

  await prisma.documentAssignment.update({
    where: { id: assignmentId },
    data: {
      status: "SIGNED",
      signedName,
      signatureData: signatureData || signedName,
      signedAt: new Date(),
    },
  });
  revalidatePath("/driver/documents");
  revalidatePath(`/driver/documents/${assignmentId}`);
  return undefined;
}

/**
 * Field-based signing for PDF documents. `inputs` carries the values the driver
 * supplied — signature/initials PNGs and free-text fields, keyed by field id.
 * Auto-fill fields are resolved server-side from the driver's profile.
 */
export async function signWithFields(
  assignmentId: string,
  inputs: Record<string, { text?: string; signaturePng?: string }>,
): Promise<{ error?: string; ok?: boolean }> {
  const { driver } = await getCurrentDriver();

  const assignment = await prisma.documentAssignment.findFirst({
    where: { id: assignmentId, driverId: driver.id },
    include: { document: { include: { fields: true } }, driver: { include: { user: true } } },
  });
  if (!assignment) return { error: "Document not found" };
  if (assignment.status === "SIGNED") return { error: "Already signed" };
  if (assignment.status === "VOIDED") return { error: "This document was voided" };
  if (!assignment.document.content) return { error: "Document has no content" };

  const signedAt = new Date();
  const signer: SignerData = {
    firstName: assignment.driver.user.firstName,
    lastName: assignment.driver.user.lastName,
    email: assignment.driver.user.email,
    phone: assignment.driver.user.phone,
    dateOfBirth: driver.dateOfBirth,
    licenseNumber: driver.licenseNumber,
    licenseState: driver.licenseState,
    address: driver.address,
    city: driver.city,
    state: driver.state,
    zip: driver.zip,
  };

  // Resolve every field's final value.
  const values: Record<string, ResolvedValue> = {};
  const storedText: Record<string, string> = {};
  let firstSignature: string | null = null;

  for (const f of assignment.document.fields) {
    const type = f.type as FieldType;
    if (isSignatureField(type)) {
      const png = inputs[f.id]?.signaturePng;
      if (!png) {
        if (f.required) return { error: "Please complete all signature fields" };
        continue;
      }
      values[f.id] = { signaturePng: png };
      if (!firstSignature) firstSignature = png;
    } else if (isAutoField(type)) {
      const text = resolveAutoField(type, signer, signedAt);
      values[f.id] = { text };
      storedText[f.id] = text;
    } else {
      // TEXT
      const text = (inputs[f.id]?.text ?? "").trim();
      if (!text && f.required) return { error: "Please fill in all required text fields" };
      values[f.id] = { text };
      storedText[f.id] = text;
    }
  }

  if (assignment.document.fields.length === 0) {
    return { error: "This document has no fields to sign. Contact your company." };
  }

  const hdrs = await headers();
  const signerIp =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";

  const company = await prisma.company.findUnique({
    where: { id: driver.companyId },
    select: { name: true },
  });

  let signedPdf: string;
  let hash: string;
  try {
    const result = await generateSignedPdf({
      originalDataUrl: assignment.document.content,
      fields: assignment.document.fields.map(
        (f): PlacedField => ({
          id: f.id,
          type: f.type,
          page: f.page,
          x: f.x,
          y: f.y,
          w: f.w,
          h: f.h,
        }),
      ),
      values,
      cert: {
        envelopeId: assignment.id,
        documentTitle: assignment.document.title,
        signerName: `${signer.firstName} ${signer.lastName}`,
        signerEmail: signer.email,
        companyName: company?.name ?? "",
        signerIp,
        createdAt: assignment.createdAt,
        viewedAt: assignment.viewedAt,
        signedAt,
      },
    });
    signedPdf = result.pdfBase64;
    hash = result.hash;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to generate signed PDF" };
  }

  await prisma.documentAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "SIGNED",
      signedName: `${signer.firstName} ${signer.lastName}`,
      signedAt,
      signatureData: firstSignature,
      fieldValues: storedText,
      signedPdf,
      contentHash: hash,
      signerIp,
    },
  });

  revalidatePath("/driver/documents");
  revalidatePath(`/driver/documents/${assignment.id}`);
  return { ok: true };
}

export async function declineDocument(assignmentId: string, reason: string) {
  const a = await assertOwnAssignment(assignmentId);
  if (a.status === "SIGNED") throw new Error("Already signed");
  await prisma.documentAssignment.update({
    where: { id: assignmentId },
    data: { status: "DECLINED", declinedReason: reason || null },
  });
  revalidatePath("/driver/documents");
  revalidatePath(`/driver/documents/${assignmentId}`);
}
