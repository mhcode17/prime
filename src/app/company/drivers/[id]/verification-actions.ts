"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { sendEmail, EmailError } from "@/lib/email";
import type { VerificationStatus } from "@prisma/client";

function fmtDate(d: Date | null): string {
  if (!d) return "Present";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

/** Ensure the experience has a verification token; returns the full public URL. */
async function ensureLink(exp: { id: string; verificationToken: string | null }): Promise<string> {
  let token = exp.verificationToken;
  if (!token) {
    token = randomUUID();
    await prisma.driverExperience.update({
      where: { id: exp.id },
      data: { verificationToken: token },
    });
  }
  return `${baseUrl()}/verify/${token}`;
}

/** Return (creating if needed) the shareable verification link for a job entry. */
export async function ensureVerificationLink(
  experienceId: string,
): Promise<{ ok?: boolean; url?: string; error?: string }> {
  const { companyId } = await getCurrentCompany("drivers");
  const exp = await prisma.driverExperience.findFirst({
    where: { id: experienceId, driver: { companyId } },
    select: { id: true, verificationToken: true },
  });
  if (!exp) return { error: "Experience not found" };
  return { ok: true, url: await ensureLink(exp) };
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
  const link = await ensureLink(exp);

  const text = `Hello,

${company.name} is verifying the prior employment of ${driverName}, who reports working at ${exp.employerName} (${period}).

Please complete the secure online verification form (confirm dates, position, rehire eligibility, DOT drug & alcohol history and accidents, then sign):

${link}

It only takes a minute. If you prefer, you can also reply to this email.

Thank you,
${company.name}`;

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.5">
      <p>Hello,</p>
      <p><b>${company.name}</b> is verifying the prior employment of <b>${driverName}</b>, who reports working at <b>${exp.employerName}</b> (${period}).</p>
      <p>Please complete the secure online verification form — confirm dates, position, rehire eligibility, DOT drug &amp; alcohol history and accidents, then sign:</p>
      <p style="margin:20px 0">
        <a href="${link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold">Complete verification →</a>
      </p>
      <p style="color:#64748b;font-size:12px">Or open this link: <a href="${link}">${link}</a></p>
      <p>Thank you,<br/>${company.name}</p>
    </div>`;

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
