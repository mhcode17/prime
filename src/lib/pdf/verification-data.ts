import "server-only";
import type { VerificationPdfData } from "./verification";
import type { Accident } from "../sph";
import type { DriverExperience, Company, User } from "@prisma/client";

export type ExperienceForPdf = DriverExperience & {
  driver: { user: User; company: Company };
};

function fmtDay(d: Date | null): string {
  if (!d) return "Present";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Map a DriverExperience (with its driver.user + driver.company) to the shape
 * the Employment Verification PDF generator expects. Shared by the download
 * route and the "add to Documents" action so both produce an identical file.
 */
export function buildVerificationData(exp: ExperienceForPdf): VerificationPdfData {
  const co = exp.driver.company;
  const cityStateZip = (city: string | null, state: string | null, zip: string | null) =>
    [[city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" ").trim();
  const companyAddressLine = [co.address, cityStateZip(co.city, co.state, co.zip)].filter(Boolean).join(" ").trim();

  const appDate = exp.consentSignedAt;
  let releaseFrom = "";
  if (appDate) {
    const from = new Date(appDate);
    from.setFullYear(from.getFullYear() - 3);
    releaseFrom = fmtDay(from);
  }

  type Attempt = { method?: string; by?: string; date?: string };
  const rawAttempts = Array.isArray(exp.attempts) ? (exp.attempts as unknown as Attempt[]) : [];
  const attempts = rawAttempts.map((a) => ({
    method: String(a.method ?? ""),
    by: String(a.by ?? ""),
    date: a.date ? fmtDay(new Date(a.date)) : "",
  }));

  return {
    envelopeId: exp.id,
    applicantName: `${exp.driver.user.firstName} ${exp.driver.user.lastName}`,
    employerName: exp.employerName,
    companyName: co.name,
    companyLogo: co.logo,
    companyPhone: co.phone,
    companyEmail: co.safetyEmail ?? null,
    companyAddressLine: companyAddressLine || null,
    companyStreet: co.address,
    companyCityStateZip: cityStateZip(co.city, co.state, co.zip) || null,
    companyAttention: co.safetyAttention,
    companyFax: co.faxNumber,

    employerEmail: exp.email,
    employerPhone: exp.phone,
    employerStreet: null,
    employerCityStateZip: cityStateZip(exp.city, exp.state, null) || null,
    employerFax: null,

    releaseFrom,
    releaseTo: appDate ? fmtDay(appDate) : "",

    attempts,
    infoReceivedMethod: exp.infoReceivedMethod,
    infoReceivedAt: exp.infoReceivedAt,

    position: exp.position ?? "",
    datesStated: `${fmtDay(exp.startDate)} — ${exp.isCurrent ? "Present" : fmtDay(exp.endDate)}`,
    consentSignature: exp.consentSignature,
    consentSignedAt: exp.consentSignedAt,
    consentIp: exp.consentIp,

    employedByUs: exp.employedByUs,
    confirmedStartDate: exp.confirmedStartDate,
    confirmedEndDate: exp.confirmedEndDate,
    didDriveVehicle: exp.didDriveVehicle,
    vehicleTypes: exp.vehicleTypes ?? [],
    vehicleTypeOther: exp.vehicleTypeOther,
    reasonForLeavingType: exp.reasonForLeavingType,
    eligibleForRehire: exp.eligibleForRehire,
    noSafetyHistory: exp.noSafetyHistory,
    accidents: (exp.accidents as unknown as Accident[] | null) ?? [],
    otherAccidents: exp.otherAccidents,
    accidentRemarks: exp.accidentRemarks,

    noDrugAlcoholInfo: exp.noDrugAlcoholInfo,
    daAlcoholTest: exp.daAlcoholTest,
    daPositiveTest: exp.daPositiveTest,
    daRefusals: exp.daRefusals,
    daOtherViolations: exp.daOtherViolations,
    daSapSubsequent: exp.daSapSubsequent,

    ratings: (exp.ratings as unknown as Record<string, string> | null) ?? {},

    responderName: exp.responderName,
    responderTitle: exp.responderTitle,
    responderSignature: exp.responderSignature,
    respondedAt: exp.respondedAt,
    responderIp: exp.responderIp,
  };
}
