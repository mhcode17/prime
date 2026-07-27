import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

const COOKIE_NAME = "tc_session";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  COMPANY: "/company",
  DRIVER: "/driver",
};

// Route prefix -> allowed role
const PROTECTED: { prefix: string; role: string }[] = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/company", role: "COMPANY" },
  { prefix: "/driver", role: "DRIVER" },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const match = PROTECTED.find((p) => pathname.startsWith(p.prefix));
  if (!match) return NextResponse.next();

  const session = await verifyToken(req.cookies.get(COOKIE_NAME)?.value);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session.role !== match.role) {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[session.role] ?? "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/company/:path*", "/driver/:path*"],
};
