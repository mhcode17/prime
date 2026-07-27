"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";

// Ensure the driver belongs to the current company; returns driver or throws.
async function assertOwnDriver(driverId: string) {
  const { companyId } = await getCurrentCompany("drivers");
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, companyId },
  });
  if (!driver) throw new Error("Driver not found");
  return { driver, companyId };
}

export async function hireDriver(driverId: string) {
  await assertOwnDriver(driverId);
  await prisma.driver.update({
    where: { id: driverId },
    data: { status: "ACTIVE", hireDate: new Date(), terminationDate: null },
  });
  revalidatePath(`/company/drivers/${driverId}`);
  revalidatePath("/company/drivers");
}

export async function terminateDriver(driverId: string) {
  await assertOwnDriver(driverId);
  await prisma.driver.update({
    where: { id: driverId },
    data: { status: "TERMINATED", terminationDate: new Date() },
  });
  // Free up any assigned equipment
  await prisma.equipmentAssignment.updateMany({
    where: { driverId, active: true },
    data: { active: false, unassignedAt: new Date() },
  });
  revalidatePath(`/company/drivers/${driverId}`);
  revalidatePath("/company/drivers");
}

export async function reinstateDriver(driverId: string) {
  await assertOwnDriver(driverId);
  await prisma.driver.update({
    where: { id: driverId },
    data: { status: "PENDING", terminationDate: null },
  });
  revalidatePath(`/company/drivers/${driverId}`);
  revalidatePath("/company/drivers");
}

const infoSchema = z.object({
  driverId: z.string(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  licenseClass: z.string().optional(),
  licenseExpiry: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export async function updateDriverInfo(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const parsed = infoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;
  await assertOwnDriver(d.driverId);

  await prisma.driver.update({
    where: { id: d.driverId },
    data: {
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
      licenseNumber: d.licenseNumber || null,
      licenseState: d.licenseState || null,
      licenseClass: d.licenseClass || null,
      licenseExpiry: d.licenseExpiry ? new Date(d.licenseExpiry) : null,
      address: d.address || null,
      city: d.city || null,
      state: d.state || null,
      zip: d.zip || null,
      emergencyContactName: d.emergencyContactName || null,
      emergencyContactPhone: d.emergencyContactPhone || null,
    },
  });
  if (d.phone !== undefined) {
    await prisma.user.update({
      where: { id: (await prisma.driver.findUnique({ where: { id: d.driverId } }))!.userId },
      data: { phone: d.phone || null },
    });
  }
  revalidatePath(`/company/drivers/${d.driverId}`);
  return { ok: true };
}
