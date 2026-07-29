"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import type { VerificationStatus } from "@prisma/client";

const STATUSES: VerificationStatus[] = [
  "NOT_REQUESTED",
  "REQUESTED",
  "VERIFIED",
  "UNABLE_TO_VERIFY",
  "NO_RESPONSE",
];

/** Company records the employment-verification result for a driver's past job. */
export async function recordVerification(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { companyId, session } = await getCurrentCompany("drivers");
  const experienceId = String(formData.get("experienceId") ?? "");

  const exp = await prisma.driverExperience.findFirst({
    where: { id: experienceId, driver: { companyId } },
  });
  if (!exp) return { error: "Experience not found" };

  const status = String(formData.get("status") ?? "") as VerificationStatus;
  if (!STATUSES.includes(status)) return { error: "Invalid status" };

  const decided = ["VERIFIED", "UNABLE_TO_VERIFY", "NO_RESPONSE"].includes(status);
  const triState = (v: FormDataEntryValue | null) =>
    v === "yes" ? true : v === "no" ? false : null;

  await prisma.driverExperience.update({
    where: { id: experienceId },
    data: {
      verificationStatus: status,
      verificationMethod: String(formData.get("method") ?? "").trim() || null,
      verificationNotes: String(formData.get("notes") ?? "").trim() || null,
      datesConfirmed: triState(formData.get("datesConfirmed")),
      eligibleForRehire: triState(formData.get("eligibleForRehire")),
      verifiedByName: decided ? session.name : null,
      verifiedAt: decided ? new Date() : null,
    },
  });

  revalidatePath(`/company/drivers/${exp.driverId}`);
  return { ok: true };
}
