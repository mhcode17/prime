import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateConsentPdf } from "@/lib/pdf/consent";

function fmt(d: Date | null): string {
  if (!d) return "Present";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Public — the tokenized link authorizes the prior employer to view/download
// the applicant's signed consent.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const exp = await prisma.driverExperience.findFirst({
    where: { verificationToken: token },
    include: { driver: { include: { user: true, company: true } } },
  });
  if (!exp || !exp.consentSignature) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bytes = await generateConsentPdf({
    applicantName: `${exp.driver.user.firstName} ${exp.driver.user.lastName}`,
    employerName: exp.employerName,
    companyName: exp.driver.company.name,
    position: exp.position ?? "",
    datesStated: `${fmt(exp.startDate)} — ${exp.isCurrent ? "Present" : fmt(exp.endDate)}`,
    signaturePng: exp.consentSignature,
    signedAt: exp.consentSignedAt,
    signerIp: exp.consentIp,
  });

  const safe = exp.employerName.replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Consent_${safe}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
