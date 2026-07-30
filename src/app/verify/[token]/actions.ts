"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";

const tri = (v: FormDataEntryValue | null) =>
  v === "yes" ? true : v === "no" ? false : null;

/**
 * Public submission by a prior employer via the tokenized link.
 * No auth — the unguessable token authorizes this one response.
 */
export async function submitVerification(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Invalid link" };

  const exp = await prisma.driverExperience.findFirst({
    where: { verificationToken: token },
  });
  if (!exp) return { error: "This link is invalid or has expired." };
  if (exp.respondedAt) return { error: "This verification has already been submitted." };

  const responderName = String(formData.get("responderName") ?? "").trim();
  const responderTitle = String(formData.get("responderTitle") ?? "").trim();
  const signature = String(formData.get("signature") ?? "").trim();
  const consent = formData.get("consent");

  if (!responderName) return { error: "Please enter your name" };
  if (!signature) return { error: "Please sign at the bottom" };
  if (!consent) return { error: "Please confirm the information is accurate" };

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";

  await prisma.driverExperience.update({
    where: { id: exp.id },
    data: {
      verificationStatus: "VERIFIED",
      verificationMethod: "online",
      datesConfirmed: tri(formData.get("datesConfirmed")),
      eligibleForRehire: tri(formData.get("eligibleForRehire")),
      drugAlcoholViolation: tri(formData.get("drugAlcoholViolation")),
      dotRecordableAccident: tri(formData.get("dotRecordableAccident")),
      verificationNotes: String(formData.get("comments") ?? "").trim() || null,
      responderName,
      responderTitle: responderTitle || null,
      responderSignature: signature,
      respondedAt: new Date(),
      responderIp: ip,
      verifiedByName: responderName,
      verifiedAt: new Date(),
    },
  });

  return { ok: true };
}
