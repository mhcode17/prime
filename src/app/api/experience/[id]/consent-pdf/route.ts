import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { generateConsentPdf } from "@/lib/pdf/consent";

function fmt(d: Date | null): string {
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

  if (!exp.consentSignature) {
    return new NextResponse("Consent has not been signed yet", { status: 404 });
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
