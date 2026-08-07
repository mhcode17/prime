"use server";

import { createHash, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { sendEmail, EmailError } from "@/lib/email";
import { generateAgreementPdf } from "@/lib/pdf/agreement";
import { buildAgreementData } from "@/lib/pdf/agreement-data";

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const withRels = { driver: { include: { user: true, company: true } } } as const;

/** Company creates (and optionally emails) a Driver Independent Contractor Agreement. */
export async function createAgreement(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { companyId } = await getCurrentCompany("drivers");
  const driverId = String(formData.get("driverId") ?? "");
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, companyId },
    include: { user: true },
  });
  if (!driver) return { error: "Driver not found" };

  const clamp = (k: string, max = 120) => String(formData.get(k) ?? "").trim().slice(0, max) || null;

  const agreement = await prisma.driverAgreement.create({
    data: {
      driverId,
      contractorName: clamp("contractorName") ?? `${driver.user.firstName} ${driver.user.lastName}`,
      compensationPercent: clamp("compensationPercent", 20),
      cpm: clamp("cpm", 20),
      securityDeposit: clamp("securityDeposit", 20),
      depositWeeklyInstallment: clamp("depositWeeklyInstallment", 20),
      equipmentLessor: clamp("equipmentLessor"),
      status: "SENT",
      token: randomUUID(),
      sentAt: new Date(),
    },
  });

  if (formData.get("sendEmail") === "on" && driver.user.email) {
    await emailAgreement(agreement.id).catch(() => null);
  }

  revalidatePath(`/company/drivers/${driverId}`);
  return { ok: true };
}

async function emailAgreement(agreementId: string): Promise<{ ok?: boolean; error?: string }> {
  const agreement = await prisma.driverAgreement.findUnique({ where: { id: agreementId }, include: withRels });
  if (!agreement || !agreement.token) return { error: "Agreement not found" };
  const to = agreement.driver.user.email;
  if (!to) return { error: "Driver has no email on file." };
  const company = agreement.driver.company.name;
  const link = `${baseUrl()}/agreement/${agreement.token}`;
  const driverName = `${agreement.driver.user.firstName} ${agreement.driver.user.lastName}`;

  const text = `Hello ${driverName},

${company} has sent you a Driver Independent Contractor Agreement to review and sign.

Open the secure link, read the agreement, then sign at the bottom:

${link}

Thank you,
${company}`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.5">
      <p>Hello ${esc(driverName)},</p>
      <p><b>${esc(company)}</b> has sent you a <b>Driver Independent Contractor Agreement</b> to review and sign.</p>
      <p style="margin:20px 0"><a href="${esc(link)}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold">Review &amp; sign agreement →</a></p>
      <p style="color:#64748b;font-size:12px">Or open this link: <a href="${esc(link)}">${esc(link)}</a></p>
      <p>Thank you,<br/>${esc(company)}</p>
    </div>`;

  try {
    await sendEmail({ to, subject: `Independent Contractor Agreement — ${company}`, text, html });
  } catch (e) {
    return { ok: false, error: e instanceof EmailError ? e.message : "Failed to send email" };
  }
  return { ok: true };
}

/** Send / resend the signing link to the driver by email. */
export async function sendAgreementEmail(agreementId: string): Promise<{ ok?: boolean; error?: string }> {
  const { companyId } = await getCurrentCompany("drivers");
  const a = await prisma.driverAgreement.findFirst({ where: { id: agreementId, driver: { companyId } }, select: { id: true, driverId: true } });
  if (!a) return { error: "Agreement not found" };
  const res = await emailAgreement(a.id);
  if (res.ok) revalidatePath(`/company/drivers/${a.driverId}`);
  return res;
}

/** Return (creating if needed) the shareable signing link. */
export async function ensureAgreementLink(agreementId: string): Promise<{ ok?: boolean; url?: string; error?: string }> {
  const { companyId } = await getCurrentCompany("drivers");
  const a = await prisma.driverAgreement.findFirst({ where: { id: agreementId, driver: { companyId } }, select: { id: true, token: true } });
  if (!a) return { error: "Agreement not found" };
  let token = a.token;
  if (!token) {
    token = randomUUID();
    await prisma.driverAgreement.update({ where: { id: a.id }, data: { token } });
  }
  return { ok: true, url: `${baseUrl()}/agreement/${token}` };
}

/** Void (cancel) an agreement. */
export async function voidAgreement(agreementId: string): Promise<{ ok?: boolean; error?: string }> {
  const { companyId } = await getCurrentCompany("drivers");
  const a = await prisma.driverAgreement.findFirst({ where: { id: agreementId, driver: { companyId } }, select: { id: true, driverId: true } });
  if (!a) return { error: "Agreement not found" };
  await prisma.driverAgreement.update({ where: { id: a.id }, data: { status: "VOIDED", token: null } });
  revalidatePath(`/company/drivers/${a.driverId}`);
  return { ok: true };
}

/** Delete an agreement entirely (and its filed Document, if any). */
export async function deleteAgreement(agreementId: string): Promise<{ ok?: boolean; error?: string }> {
  const { companyId } = await getCurrentCompany("drivers");
  const a = await prisma.driverAgreement.findFirst({ where: { id: agreementId, driver: { companyId } }, select: { id: true, driverId: true, agreementDocumentId: true } });
  if (!a) return { error: "Agreement not found" };
  if (a.agreementDocumentId) {
    await prisma.document.deleteMany({ where: { id: a.agreementDocumentId, companyId } });
  }
  await prisma.driverAgreement.delete({ where: { id: a.id } });
  revalidatePath(`/company/drivers/${a.driverId}`);
  revalidatePath(`/company/drivers/${a.driverId}/documents`);
  return { ok: true };
}

/** File the signed agreement PDF into the driver's Documents (idempotent). */
export async function addAgreementToDocuments(agreementId: string): Promise<{ ok?: boolean; error?: string }> {
  const { companyId, session } = await getCurrentCompany("drivers");
  const a = await prisma.driverAgreement.findFirst({ where: { id: agreementId, driver: { companyId } }, include: withRels });
  if (!a) return { error: "Agreement not found" };
  if (!a.signedAt) return { error: "Agreement is not signed yet." };

  const bytes = await generateAgreementPdf(buildAgreementData(a));
  const dataUrl = `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}`;
  const hash = createHash("sha256").update(bytes).digest("hex");
  const applicant = `${a.driver.user.firstName} ${a.driver.user.lastName}`;
  const title = `Independent Contractor Agreement — ${applicant}`;
  const fileName = `${applicant} - Independent Contractor Agreement.pdf`.replace(/[^a-z0-9 &.\-]/gi, " ").replace(/\s+/g, " ").trim();

  const existing = a.agreementDocumentId
    ? await prisma.document.findFirst({ where: { id: a.agreementDocumentId, companyId } })
    : null;

  let documentId: string;
  if (existing) {
    await prisma.document.update({ where: { id: existing.id }, data: { title, kind: "AGREEMENT", fileName, fileType: "application/pdf", content: dataUrl } });
    documentId = existing.id;
  } else {
    const doc = await prisma.document.create({
      data: {
        companyId,
        title,
        description: `Signed Driver Independent Contractor Agreement for ${applicant}.`,
        kind: "AGREEMENT",
        fileName,
        fileType: "application/pdf",
        content: dataUrl,
        uploadedById: session.userId,
      },
    });
    documentId = doc.id;
  }

  await prisma.documentAssignment.upsert({
    where: { documentId_driverId: { documentId, driverId: a.driverId } },
    create: {
      documentId, driverId: a.driverId, status: "SIGNED", signedPdf: dataUrl,
      signedName: a.signerName ?? applicant, signedAt: a.signedAt, contentHash: hash, signerIp: a.signerIp,
    },
    update: {
      status: "SIGNED", signedPdf: dataUrl, signedName: a.signerName ?? applicant, signedAt: a.signedAt, contentHash: hash,
    },
  });

  if (a.agreementDocumentId !== documentId) {
    await prisma.driverAgreement.update({ where: { id: a.id }, data: { agreementDocumentId: documentId } });
  }

  revalidatePath(`/company/drivers/${a.driverId}`);
  revalidatePath(`/company/drivers/${a.driverId}/documents`);
  return { ok: true };
}
