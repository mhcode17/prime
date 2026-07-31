import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { generateVerificationPdf } from "@/lib/pdf/verification";
import type { Accident } from "@/lib/sph";

function fmtDay(d: Date | null): string {
  if (!d) return "Present";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const exp = await prisma.driverExperience.findUnique({
    where: { id },
    include: { driver: { include: { user: true, company: true } } },
  });
  if (!exp) return new NextResponse("Not found", { status: 404 });

  const allowed =
    session.role === "ADMIN" ||
    (session.role === "COMPANY" && session.companyId === exp.driver.companyId) ||
    (session.role === "DRIVER" && session.userId === exp.driver.userId);
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  if (!exp.respondedAt) {
    return new NextResponse("Verification has not been completed yet", { status: 404 });
  }

  const co = exp.driver.company;
  const cityStateZip = (city: string | null, state: string | null, zip: string | null) =>
    [[city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" ").trim();
  const companyAddressLine = [co.address, cityStateZip(co.city, co.state, co.zip)].filter(Boolean).join(" ").trim();

  // Alcohol/controlled-substances release window: 3 years back from the
  // application date (approximated by when the driver signed the consent).
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

  const bytes = await generateVerificationPdf({
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
  });

  // File name: "Troy Ford - PEV BEK TRANS GROUP INC.pdf"
  const clean = (s: string) => s.replace(/[^a-z0-9 &.\-]/gi, " ").replace(/\s+/g, " ").trim();
  const driverName = clean(`${exp.driver.user.firstName} ${exp.driver.user.lastName}`);
  const fileName = `${driverName} - PEV ${clean(exp.employerName)}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
