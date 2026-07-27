import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getSession, type SessionPayload } from "./session";

/** Require any authenticated user; redirect to /login otherwise. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Require a specific role (or one of several). Redirects to the user's
 *  home dashboard if the role does not match, or to /login if unauthenticated. */
export async function requireRole(
  roles: Role | Role[],
): Promise<SessionPayload> {
  const session = await requireSession();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.role)) {
    redirect(dashboardPathFor(session.role));
  }
  return session;
}

export function dashboardPathFor(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "COMPANY":
      return "/company";
    case "DRIVER":
      return "/driver";
    default:
      return "/login";
  }
}
