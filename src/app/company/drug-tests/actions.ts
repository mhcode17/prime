"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import type { DrugTestType, DrugTestStatus } from "@prisma/client";

async function assertOwnDriver(driverId: string) {
  const { companyId } = await getCurrentCompany("drugTests");
  const driver = await prisma.driver.findFirst({ where: { id: driverId, companyId } });
  if (!driver) throw new Error("Driver not found");
}

export async function orderDrugTest(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const driverId = String(formData.get("driverId") ?? "");
  const type = String(formData.get("type") ?? "PRE_EMPLOYMENT") as DrugTestType;
  const labName = String(formData.get("labName") ?? "").trim();
  const scheduledAt = String(formData.get("scheduledAt") ?? "");

  if (!driverId) return { error: "Select a driver" };
  await assertOwnDriver(driverId);

  await prisma.drugTest.create({
    data: {
      driverId,
      type,
      labName: labName || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? "SCHEDULED" : "ORDERED",
    },
  });
  revalidatePath("/company/drug-tests");
  revalidatePath(`/company/drivers/${driverId}`);
  return { ok: true };
}

export async function setDrugTestResult(id: string, status: DrugTestStatus) {
  const { companyId } = await getCurrentCompany("drugTests");
  const test = await prisma.drugTest.findFirst({
    where: { id, driver: { companyId } },
  });
  if (!test) throw new Error("Not found");
  await prisma.drugTest.update({
    where: { id },
    data: {
      status,
      completedAt: status.startsWith("COMPLETED") ? new Date() : null,
    },
  });
  revalidatePath("/company/drug-tests");
  revalidatePath(`/company/drivers/${test.driverId}`);
}
