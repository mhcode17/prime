"use server";

import { createHash, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { sendEmail, EmailError } from "@/lib/email";
import { generateVerificationPdf } from "@/lib/pdf/verification";
import { buildVerificationData } from "@/lib/pdf/verification-data";
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

  const attempts = Array.isArray(exp.attempts) ? (exp.attempts as unknown[]) : [];
  attempts.push({ method: "email", by: session.name, date: new Date().toISOString() });

  await prisma.driverExperience.update({
    where: { id: exp.id },
    data: {
      verificationStatus: exp.verificationStatus === "NOT_REQUESTED" ? "REQUESTED" : exp.verificationStatus,
      verificationMethod: "email",
      attempts: attempts as object[],
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

/**
 * Re-send the verification request: issues a fresh link (invalidating the old
 * one), re-opens the request for a new response, and emails the prior employer.
 */
export async function resendVerification(
  experienceId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { companyId, company, session } = await getCurrentCompany("drivers");
  const exp = await prisma.driverExperience.findFirst({
    where: { id: experienceId, driver: { companyId } },
    include: { driver: { include: { user: true } } },
  });
  if (!exp) return { error: "Experience not found" };
  if (!exp.email) return { error: "This employer has no email address on file." };

  const token = randomUUID();
  const link = `${baseUrl()}/verify/${token}`;
  const driverName = `${exp.driver.user.firstName} ${exp.driver.user.lastName}`;
  const period = `${fmtDate(exp.startDate)} — ${exp.isCurrent ? "Present" : fmtDate(exp.endDate)}`;

  const text = `Hello,

${company.name} is verifying the prior employment of ${driverName}, who reports working at ${exp.employerName} (${period}).

Please complete the secure online verification form:

${link}

Thank you,
${company.name}`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.5">
      <p>Hello,</p>
      <p><b>${company.name}</b> is verifying the prior employment of <b>${driverName}</b>, who reports working at <b>${exp.employerName}</b> (${period}).</p>
      <p style="margin:20px 0"><a href="${link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold">Complete verification →</a></p>
      <p style="color:#64748b;font-size:12px">Or open this link: <a href="${link}">${link}</a></p>
      <p>Thank you,<br/>${company.name}</p>
    </div>`;

  try {
    await sendEmail({ to: exp.email, subject: `Employment Verification — ${driverName}`, text, html, replyTo: session.email });
  } catch (e) {
    return { ok: false, error: e instanceof EmailError ? e.message : "Failed to send email" };
  }

  const attempts = Array.isArray(exp.attempts) ? (exp.attempts as unknown[]) : [];
  attempts.push({ method: "email (resend)", by: session.name, date: new Date().toISOString() });

  await prisma.driverExperience.update({
    where: { id: exp.id },
    data: {
      verificationToken: token,
      verificationStatus: "REQUESTED",
      verificationMethod: "email",
      attempts: attempts as object[],
      respondedAt: null,
      responderName: null,
      responderTitle: null,
      responderSignature: null,
      responderIp: null,
      verifiedAt: null,
      verifiedByName: null,
    },
  });

  revalidatePath(`/company/drivers/${exp.driverId}`);
  return { ok: true };
}

/**
 * File the completed Employment Verification PDF into the driver's Documents,
 * so all of the driver's paperwork lives in one place. Idempotent: if it was
 * already added, the existing Document + its signed record are refreshed.
 */
export async function addVerificationToDocuments(
  experienceId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { companyId, session } = await getCurrentCompany("drivers");
  const exp = await prisma.driverExperience.findFirst({
    where: { id: experienceId, driver: { companyId } },
    include: { driver: { include: { user: true, company: true } } },
  });
  if (!exp) return { error: "Experience not found" };
  if (!exp.respondedAt) return { error: "Verification is not completed yet." };

  const bytes = await generateVerificationPdf(buildVerificationData(exp));
  const dataUrl = `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}`;
  const hash = createHash("sha256").update(bytes).digest("hex");
  const applicant = `${exp.driver.user.firstName} ${exp.driver.user.lastName}`;
  const title = `Employment Verification — ${exp.employerName}`;
  const fileName = `${applicant} - PEV ${exp.employerName}.pdf`.replace(/[^a-z0-9 &.\-]/gi, " ").replace(/\s+/g, " ").trim();

  // Reuse the previously-created Document if we already filed this one.
  const existing = exp.verificationDocumentId
    ? await prisma.document.findFirst({ where: { id: exp.verificationDocumentId, companyId } })
    : null;

  let documentId: string;
  if (existing) {
    await prisma.document.update({
      where: { id: existing.id },
      data: { title, kind: "VERIFICATION", fileName, fileType: "application/pdf", content: dataUrl },
    });
    documentId = existing.id;
  } else {
    const doc = await prisma.document.create({
      data: {
        companyId,
        title,
        description: `Prior-employer safety performance history for ${applicant}.`,
        kind: "VERIFICATION",
        fileName,
        fileType: "application/pdf",
        content: dataUrl,
        uploadedById: session.userId,
      },
    });
    documentId = doc.id;
  }

  // Upsert the per-driver assignment as an already-completed (SIGNED) record.
  await prisma.documentAssignment.upsert({
    where: { documentId_driverId: { documentId, driverId: exp.driverId } },
    create: {
      documentId,
      driverId: exp.driverId,
      status: "SIGNED",
      signedPdf: dataUrl,
      signedName: exp.responderName ?? applicant,
      signedAt: exp.respondedAt,
      contentHash: hash,
      signerIp: exp.responderIp,
    },
    update: {
      status: "SIGNED",
      signedPdf: dataUrl,
      signedName: exp.responderName ?? applicant,
      signedAt: exp.respondedAt,
      contentHash: hash,
    },
  });

  if (exp.verificationDocumentId !== documentId) {
    await prisma.driverExperience.update({
      where: { id: exp.id },
      data: { verificationDocumentId: documentId },
    });
  }

  revalidatePath(`/company/drivers/${exp.driverId}`);
  revalidatePath(`/company/drivers/${exp.driverId}/documents`);
  return { ok: true };
}
