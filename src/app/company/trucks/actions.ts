"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import type { EquipmentStatus } from "@prisma/client";

export async function createTruck(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { companyId } = await getCurrentCompany("equipment");
  const unitNumber = String(formData.get("unitNumber") ?? "").trim();
  if (!unitNumber) return { error: "Unit number is required" };

  const yearRaw = String(formData.get("year") ?? "").trim();
  await prisma.truck.create({
    data: {
      companyId,
      unitNumber,
      make: String(formData.get("make") ?? "").trim() || null,
      model: String(formData.get("model") ?? "").trim() || null,
      year: yearRaw ? parseInt(yearRaw, 10) : null,
      vin: String(formData.get("vin") ?? "").trim() || null,
      plate: String(formData.get("plate") ?? "").trim() || null,
    },
  });
  revalidatePath("/company/trucks");
  return { ok: true };
}

export async function setTruckStatus(id: string, status: EquipmentStatus) {
  const { companyId } = await getCurrentCompany("equipment");
  const truck = await prisma.truck.findFirst({ where: { id, companyId } });
  if (!truck) throw new Error("Not found");
  await prisma.truck.update({ where: { id }, data: { status } });
  revalidatePath("/company/trucks");
}

export async function deleteTruck(id: string) {
  const { companyId } = await getCurrentCompany("equipment");
  const truck = await prisma.truck.findFirst({ where: { id, companyId } });
  if (!truck) throw new Error("Not found");
  await prisma.truck.delete({ where: { id } });
  revalidatePath("/company/trucks");
}
