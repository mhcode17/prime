import "server-only";
import type { AgreementPdfData } from "./agreement";
import type { DriverAgreement, Company, User } from "@prisma/client";

export type AgreementForPdf = DriverAgreement & {
  driver: { user: User; company: Company };
};

/** Map a DriverAgreement (+ driver.user/company) to the PDF generator input. */
export function buildAgreementData(a: AgreementForPdf): AgreementPdfData {
  const co = a.driver.company;
  const cityStateZip = [[co.city, co.state].filter(Boolean).join(", "), co.zip].filter(Boolean).join(" ").trim();
  const companyAddressLine = [co.address, cityStateZip].filter(Boolean).join(" ").trim();
  const driverName = `${a.driver.user.firstName} ${a.driver.user.lastName}`;

  return {
    envelopeId: a.id,
    companyName: co.name,
    companyLogo: co.logo,
    companyPhone: co.phone,
    companyEmail: co.email ?? co.safetyEmail ?? null,
    companyWebsite: co.website,
    companyAddressLine: companyAddressLine || null,
    docsEmail: co.email ?? null,

    contractorName: a.contractorName || driverName,
    compensationPercent: a.compensationPercent ?? "",
    cpm: a.cpm ?? "",
    securityDeposit: a.securityDeposit ?? "0",
    depositWeeklyInstallment: a.depositWeeklyInstallment ?? "0",
    equipmentLessor: a.equipmentLessor ?? "",

    signerName: a.signerName,
    signerSignature: a.signerSignature,
    signedAt: a.signedAt,
    signerIp: a.signerIp,
  };
}
