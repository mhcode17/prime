"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { sendEmail, EmailError } from "@/lib/email";
import type { VerificationStatus } from "@prisma/client";

function fmtDate(d: Date | null): string {
  if (!d) return "Present";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

/** Send the employment-verification request email to the prior employer. */
export async function sendVerificationEmail(
  experienceId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { companyId, company, session } = await getCurrentCompany("drivers");

  const exp = await prisma.driverExperience.findFirst({
    where: { id: experienceId, driver: { companyId } },
    include: { driver: { include: { user: true } } },
  });
  if (!exp) return { error: "Experience not found" };
  if (!exp.email) return { error: "This employer has no email address on file." };

  const driverName = `${exp.driver.user.firstName} ${exp.driver.user.lastName}`;
  const period = `${fmtDate(exp.startDate)} — ${exp.isCurrent ? "Present" : fmtDate(exp.endDate)}`;

  const text = `Hello,

${company.name} is verifying the prior employment of ${driverName}, who reports working at ${exp.employerName} (${period}).

Please confirm:
1. Employment dates${exp.position ? ` and position (${exp.position})` : ""}
2. Eligibility for rehire
3. Reason for leaving
4. (DOT) Any drug & alcohol testing program violations, refusals, or DOT-recordable accidents during employment

You can simply reply to this email with your response.

Thank you,
${company.name}`;

  const html = text
    .split("\n")
    .map((l) => (l.trim() ? `<p style="margin:0 0 10px">${l}</p>` : "<br/>"))
    .join("");

  try {
    await sendEmail({
      to: exp.email,
      subject: `Employment Verification — ${driverName}`,
      text,
      html,
      replyTo: session.email,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof EmailError ? e.message : "Failed to send email",
    };
  }

  await prisma.driverExperience.update({
    where: { id: exp.id },
    data: {
      verificationStatus: exp.verificationStatus === "NOT_REQUESTED" ? "REQUESTED" : exp.verificationStatus,
      verificationMethod: "email",
      verificationNotes: appendNote(exp.verificationNotes, `Request emailed to ${exp.email} on ${new Date().toLocaleString("en-US")}.`),
    },
  });

  revalidatePath(`/company/drivers/${exp.driverId}`);
  return { ok: true };
}

function appendNote(existing: string | null, line: string): string {
  return existing ? `${existing}\n${line}` : line;
}

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
