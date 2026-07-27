import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const assignment = await prisma.documentAssignment.findUnique({
    where: { id },
    include: {
      document: { select: { companyId: true, title: true } },
      driver: { select: { userId: true } },
    },
  });
  if (!assignment) return new NextResponse("Not found", { status: 404 });

  // Authorize: admin, the document's company, or the signing driver.
  const allowed =
    session.role === "ADMIN" ||
    (session.role === "COMPANY" && session.companyId === assignment.document.companyId) ||
    (session.role === "DRIVER" && session.userId === assignment.driver.userId);
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  if (!assignment.signedPdf) {
    return new NextResponse("Document has not been signed yet", { status: 404 });
  }

  const base64 = assignment.signedPdf.includes(",")
    ? assignment.signedPdf.split(",")[1]
    : assignment.signedPdf;
  const bytes = Buffer.from(base64, "base64");

  const safeTitle = assignment.document.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 60);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeTitle}_signed.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
