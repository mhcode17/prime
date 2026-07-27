"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import type { EquipmentStatus } from "@prisma/client";

export async function createTrailer(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { companyId } = await getCurrentCompany("equipment");
  const unitNumber = String(formData.get("unitNumber") ?? "").trim();
  if (!unitNumber) return { error: "Unit number is required" };

  const yearRaw = String(formData.get("year") ?? "").trim();
  await prisma.trailer.create({
    data: {
      companyId,
      unitNumber,
      type: String(formData.get("type") ?? "").trim() || null,
      year: yearRaw ? parseInt(yearRaw, 10) : null,
      vin: String(formData.get("vin") ?? "").trim() || null,
      plate: String(formData.get("plate") ?? "").trim() || null,
    },
  });
  revalidatePath("/company/trailers");
  return { ok: true };
}

export async function setTrailerStatus(id: string, status: EquipmentStatus) {
  const { companyId } = await getCurrentCompany("equipment");
  const trailer = await prisma.trailer.findFirst({ where: { id, companyId } });
  if (!trailer) throw new Error("Not found");
  await prisma.trailer.update({ where: { id }, data: { status } });
  revalidatePath("/company/trailers");
}

export async function deleteTrailer(id: string) {
  const { companyId } = await getCurrentCompany("equipment");
  const trailer = await prisma.trailer.findFirst({ where: { id, companyId } });
  if (!trailer) throw new Error("Not found");
  await prisma.trailer.delete({ where: { id } });
  revalidatePath("/company/trailers");
}
