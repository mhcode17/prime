"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";

async function assertOwnDriver(driverId: string) {
  const { companyId } = await getCurrentCompany("equipment");
  const driver = await prisma.driver.findFirst({ where: { id: driverId, companyId } });
  if (!driver) throw new Error("Driver not found");
  return companyId;
}

// Release the driver's current active assignment and free its equipment.
async function releaseActive(driverId: string) {
  const active = await prisma.equipmentAssignment.findFirst({
    where: { driverId, active: true },
  });
  if (!active) return;
  await prisma.equipmentAssignment.update({
    where: { id: active.id },
    data: { active: false, unassignedAt: new Date() },
  });
  if (active.truckId)
    await prisma.truck.update({ where: { id: active.truckId }, data: { status: "AVAILABLE" } });
  if (active.trailerId)
    await prisma.trailer.update({ where: { id: active.trailerId }, data: { status: "AVAILABLE" } });
}

export async function assignEquipment(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const driverId = String(formData.get("driverId") ?? "");
  const truckId = String(formData.get("truckId") ?? "") || null;
  const trailerId = String(formData.get("trailerId") ?? "") || null;

  const companyId = await assertOwnDriver(driverId);
  if (!truckId && !trailerId) return { error: "Select a truck and/or trailer" };

  // Validate equipment belongs to company and is assignable
  if (truckId) {
    const truck = await prisma.truck.findFirst({ where: { id: truckId, companyId } });
    if (!truck) return { error: "Truck not found" };
    if (truck.status === "ASSIGNED") return { error: "Truck is already assigned" };
  }
  if (trailerId) {
    const trailer = await prisma.trailer.findFirst({ where: { id: trailerId, companyId } });
    if (!trailer) return { error: "Trailer not found" };
    if (trailer.status === "ASSIGNED") return { error: "Trailer is already assigned" };
  }

  await releaseActive(driverId);

  await prisma.equipmentAssignment.create({
    data: { driverId, truckId, trailerId, active: true },
  });
  if (truckId)
    await prisma.truck.update({ where: { id: truckId }, data: { status: "ASSIGNED" } });
  if (trailerId)
    await prisma.trailer.update({ where: { id: trailerId }, data: { status: "ASSIGNED" } });

  revalidatePath(`/company/drivers/${driverId}/equipment`);
  revalidatePath(`/company/drivers/${driverId}`);
  revalidatePath("/company/trucks");
  revalidatePath("/company/trailers");
  return { ok: true };
}

export async function unassignEquipment(driverId: string) {
  await assertOwnDriver(driverId);
  await releaseActive(driverId);
  revalidatePath(`/company/drivers/${driverId}/equipment`);
  revalidatePath(`/company/drivers/${driverId}`);
  revalidatePath("/company/trucks");
  revalidatePath("/company/trailers");
}
