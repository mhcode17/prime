"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { ACTIVE_COMPANY_COOKIE } from "@/lib/current";

/** Switch the active company (for org admins / multi-company users). */
export async function switchCompany(companyId: string) {
  const session = await requireRole("COMPANY");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { memberships: { where: { companyId } } },
  });
  if (!user) throw new Error("Not found");

  let allowed = false;
  if (user.isOrgAdmin && user.organizationId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { organizationId: true },
    });
    allowed = company?.organizationId === user.organizationId;
  } else {
    allowed = user.memberships.length > 0 || user.companyId === companyId;
  }
  if (!allowed) throw new Error("No access to that company");

  const store = await cookies();
  store.set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/company", "layout");
}
