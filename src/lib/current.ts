import "server-only";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { notFound, redirect } from "next/navigation";
import { hasPermission, type PermissionKey } from "@/lib/permissions";

/** For DRIVER pages: return the session + the driver record (with company). */
export async function getCurrentDriver() {
  const session = await requireRole("DRIVER");
  const driver = await prisma.driver.findUnique({
    where: { userId: session.userId },
    include: { user: true, company: true },
  });
  if (!driver) notFound();
  return { session, driver };
}

/**
 * For COMPANY pages: return the session, company, current company user
 * (with sub-role & permissions), and a `can()` helper.
 * Pass a `requiredPermission` to gate the page — non-permitted managers are
 * redirected to the company dashboard.
 */
export async function getCurrentCompany(requiredPermission?: PermissionKey) {
  const session = await requireRole("COMPANY");
  const [company, user] = await Promise.all([
    session.companyId
      ? prisma.company.findUnique({ where: { id: session.companyId } })
      : null,
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);
  if (!company || !user) notFound();

  const isOwner = user.companyRole === "OWNER";
  const can = (key: PermissionKey) =>
    hasPermission(user.companyRole, user.permissions, key);

  if (requiredPermission && !can(requiredPermission)) {
    redirect("/company");
  }

  return { session, company, companyId: company.id, user, isOwner, can };
}

/** Owner-only pages (staff management, company settings). */
export async function requireCompanyOwner() {
  const ctx = await getCurrentCompany();
  if (!ctx.isOwner) redirect("/company");
  return ctx;
}
