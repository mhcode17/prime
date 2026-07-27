"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/current";
import { hashPassword } from "@/lib/auth/password";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

function readPermissions(formData: FormData): string[] {
  return ALL_PERMISSION_KEYS.filter((k) => formData.get(`perm_${k}`) === "on");
}
function sanitize(permissions: string[]): string[] {
  return permissions.filter((p) => (ALL_PERMISSION_KEYS as string[]).includes(p));
}

async function assertOrgCompany(organizationId: string, companyId: string) {
  const c = await prisma.company.findFirst({
    where: { id: companyId, organizationId },
  });
  if (!c) throw new Error("Company is not in your organization");
}
async function assertOrgMember(organizationId: string, userId: string) {
  const u = await prisma.user.findFirst({
    where: { id: userId, organizationId, role: "COMPANY" },
  });
  if (!u) throw new Error("User is not in your organization");
  return u;
}

const memberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyId: z.string().min(1, "Choose a company"),
});

export async function createMember(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { organizationId } = await requireOrgAdmin();
  const parsed = memberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  await assertOrgCompany(organizationId!, d.companyId);
  const existing = await prisma.user.findUnique({
    where: { email: d.email.toLowerCase() },
  });
  if (existing) return { error: "An account with this email already exists" };

  await prisma.user.create({
    data: {
      email: d.email.toLowerCase(),
      passwordHash: await hashPassword(d.password),
      role: "COMPANY",
      organizationId,
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone || null,
      memberships: {
        create: {
          companyId: d.companyId,
          companyRole: "MANAGER",
          permissions: readPermissions(formData),
        },
      },
    },
  });
  revalidatePath("/company/staff");
  return { ok: true };
}

export async function grantMembership(
  userId: string,
  companyId: string,
  permissions: string[],
) {
  const { organizationId } = await requireOrgAdmin();
  await assertOrgMember(organizationId!, userId);
  await assertOrgCompany(organizationId!, companyId);
  await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId, companyId } },
    update: { permissions: sanitize(permissions) },
    create: { userId, companyId, companyRole: "MANAGER", permissions: sanitize(permissions) },
  });
  revalidatePath("/company/staff");
}

export async function revokeMembership(userId: string, companyId: string) {
  const { organizationId } = await requireOrgAdmin();
  await assertOrgMember(organizationId!, userId);
  const m = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (m) await prisma.companyMembership.delete({ where: { id: m.id } });
  revalidatePath("/company/staff");
}

export async function setMemberActive(userId: string, isActive: boolean) {
  const { organizationId } = await requireOrgAdmin();
  await assertOrgMember(organizationId!, userId);
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/company/staff");
}

export async function removeMember(userId: string) {
  const { organizationId } = await requireOrgAdmin();
  const u = await assertOrgMember(organizationId!, userId);
  if (u.isOrgAdmin) throw new Error("Cannot remove an organization admin");
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/company/staff");
}
