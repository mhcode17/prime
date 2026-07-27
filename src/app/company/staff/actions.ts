"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyOwner } from "@/lib/current";
import { hashPassword } from "@/lib/auth/password";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

function readPermissions(formData: FormData): string[] {
  return ALL_PERMISSION_KEYS.filter((k) => formData.get(`perm_${k}`) === "on");
}

const managerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function createManager(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { companyId } = await requireCompanyOwner();
  const parsed = managerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: d.email.toLowerCase() },
  });
  if (existing) return { error: "An account with this email already exists" };

  await prisma.user.create({
    data: {
      email: d.email.toLowerCase(),
      passwordHash: await hashPassword(d.password),
      role: "COMPANY",
      companyRole: "MANAGER",
      companyId,
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone || null,
      permissions: readPermissions(formData),
    },
  });
  revalidatePath("/company/staff");
  return { ok: true };
}

async function assertOwnManager(userId: string) {
  const { companyId } = await requireCompanyOwner();
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId, companyRole: "MANAGER" },
  });
  if (!user) throw new Error("Manager not found");
  return user;
}

export async function updateManagerPermissions(
  userId: string,
  permissions: string[],
) {
  await assertOwnManager(userId);
  const valid = permissions.filter((p) =>
    (ALL_PERMISSION_KEYS as string[]).includes(p),
  );
  await prisma.user.update({ where: { id: userId }, data: { permissions: valid } });
  revalidatePath("/company/staff");
}

export async function setManagerActive(userId: string, isActive: boolean) {
  await assertOwnManager(userId);
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/company/staff");
}

export async function removeManager(userId: string) {
  await assertOwnManager(userId);
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/company/staff");
}
