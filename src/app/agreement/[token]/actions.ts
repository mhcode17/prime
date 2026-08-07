"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/** Public submission by the driver via the tokenized link — signs the agreement. */
export async function submitAgreement(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Invalid link" };

  const a = await prisma.driverAgreement.findFirst({ where: { token } });
  if (!a) return { error: "This link is invalid or has expired." };
  if (a.status === "VOIDED") return { error: "This agreement has been canceled by the company." };
  if (a.signedAt) return { error: "This agreement has already been signed." };

  const signerName = String(formData.get("signerName") ?? "").trim().slice(0, 200);
  const signature = String(formData.get("signature") ?? "").trim();
  const consent = formData.get("consent");
  if (!signerName) return { error: "Please enter your full name" };
  if (!signature) return { error: "Please sign at the bottom" };
  if (signature.length > 2_000_000) return { error: "Signature image is too large." };
  if (!consent) return { error: "Please confirm you agree to the terms" };

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";

  await prisma.driverAgreement.update({
    where: { id: a.id },
    data: {
      status: "SIGNED",
      signerName,
      signerSignature: signature,
      signedAt: new Date(),
      signerIp: ip,
    },
  });

  return { ok: true };
}
