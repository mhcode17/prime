import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

// Serves a company logo as a real image response (not an inline data URL), so
// the multi-MB base64 never bloats the HTML/RSC payload of every page.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    select: { logo: true },
  });
  const logo = company?.logo;
  if (!logo || !logo.startsWith("data:")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const comma = logo.indexOf(",");
  const meta = logo.slice(5, comma); // e.g. "image/png;base64"
  const mime = meta.split(";")[0] || "image/png";
  const bytes = Buffer.from(logo.slice(comma + 1), "base64");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
