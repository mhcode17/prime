import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAgreementPdf } from "@/lib/pdf/agreement";
import { buildAgreementData } from "@/lib/pdf/agreement-data";

// Public — the tokenized link lets the driver view/sign, and lets the company
// preview/download the current agreement PDF (unsigned preview or signed).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const a = await prisma.driverAgreement.findFirst({
    where: { token },
    include: { driver: { include: { user: true, company: true } } },
  });
  if (!a) return new NextResponse("Not found", { status: 404 });

  const bytes = await generateAgreementPdf(buildAgreementData(a));
  const applicant = `${a.driver.user.firstName} ${a.driver.user.lastName}`;
  const clean = (s: string) => s.replace(/[^a-z0-9 &.\-]/gi, " ").replace(/\s+/g, " ").trim();
  const fileName = `${clean(applicant)} - Independent Contractor Agreement.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
