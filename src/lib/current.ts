import "server-only";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  hasPermission,
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from "@/lib/permissions";
import type { CompanyRole } from "@prisma/client";

export const ACTIVE_COMPANY_COOKIE = "tc_company";

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

interface AccessEntry {
  id: string;
  name: string;
  role: CompanyRole;
  permissions: string[];
}

/** Resolve which companies the current company-user can access, and how. */
async function loadAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: true },
  });
  if (!user) notFound();

  let accessible: AccessEntry[] = [];

  if (user.isOrgAdmin && user.organizationId) {
    const comps = await prisma.company.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    accessible = comps.map((c) => ({
      id: c.id,
      name: c.name,
      role: "OWNER" as CompanyRole,
      permissions: ALL_PERMISSION_KEYS as string[],
    }));
  } else if (user.memberships.length > 0) {
    const ids = user.memberships.map((m) => m.companyId);
    const comps = await prisma.company.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const names = new Map(comps.map((c) => [c.id, c.name]));
    accessible = user.memberships
      .filter((m) => names.has(m.companyId))
      .map((m) => ({
        id: m.companyId,
        name: names.get(m.companyId)!,
        role: m.companyRole,
        permissions: m.permissions,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } else if (user.companyId) {
    // Legacy fallback (pre-organization data).
    const c = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { id: true, name: true },
    });
    if (c) {
      accessible = [
        {
          id: c.id,
          name: c.name,
          role: user.companyRole ?? "MANAGER",
          permissions: user.permissions,
        },
      ];
    }
  }

  return { user, accessible };
}

/**
 * For COMPANY pages: resolve the active company (from the tc_company cookie or
 * the first accessible one), verify access, and expose an effective `can()`
 * plus the list of companies for the switcher.
 * Pass `requiredPermission` to gate the page.
 */
export async function getCurrentCompany(requiredPermission?: PermissionKey) {
  const session = await requireRole("COMPANY");
  const { user, accessible } = await loadAccess(session.userId);
  if (accessible.length === 0) notFound();

  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;
  const active = accessible.find((a) => a.id === cookieId) ?? accessible[0];

  const company = await prisma.company.findUnique({ where: { id: active.id } });
  if (!company) notFound();

  const isOwner = active.role === "OWNER";
  const can = (key: PermissionKey) =>
    hasPermission(active.role, active.permissions, key);

  if (requiredPermission && !can(requiredPermission)) redirect("/company");

  return {
    session,
    company,
    companyId: company.id,
    user,
    isOwner,
    can,
    permissions: active.permissions,
    isOrgAdmin: user.isOrgAdmin,
    organizationId: user.organizationId,
    accessibleCompanies: accessible.map((a) => ({ id: a.id, name: a.name })),
  };
}

/** Owner (or org admin) of the active company — for company settings. */
export async function requireCompanyOwner() {
  const ctx = await getCurrentCompany();
  if (!ctx.isOwner) redirect("/company");
  return ctx;
}

/** Organization admin — for org-level pages (companies list, team management). */
export async function requireOrgAdmin() {
  const ctx = await getCurrentCompany();
  if (!ctx.isOrgAdmin || !ctx.organizationId) redirect("/company");
  return ctx;
}
