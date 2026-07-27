"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import type { CompanyStatus } from "@prisma/client";

export async function setCompanyStatus(
  companyId: string,
  status: CompanyStatus,
) {
  await requireRole("ADMIN");
  await prisma.company.update({
    where: { id: companyId },
    data: { status },
  });
  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${companyId}`);
}

export async function setUserActive(userId: string, isActive: boolean) {
  await requireRole("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin/users");
}
