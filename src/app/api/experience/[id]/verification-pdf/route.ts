import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { generateVerificationPdf } from "@/lib/pdf/verification";
import { buildVerificationData } from "@/lib/pdf/verification-data";

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

  const bytes = await generateVerificationPdf(buildVerificationData(exp));

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
