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

  const bytes = await generateVerificationPdf({
    envelopeId: exp.id,
    applicantName: `${exp.driver.user.firstName} ${exp.driver.user.lastName}`,
    employerName: exp.employerName,
    companyName: exp.driver.company.name,
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
