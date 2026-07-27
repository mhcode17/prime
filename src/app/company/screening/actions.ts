"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { sambaProvider } from "@/lib/integrations/samba";
import type { ScreeningType } from "@prisma/client";
import type { DriverContext } from "@/lib/integrations/types";

async function ownDriverContext(driverId: string): Promise<DriverContext> {
  const { companyId } = await getCurrentCompany("screening");
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, companyId },
    include: { user: true },
  });
  if (!driver) throw new Error("Driver not found");
  return {
    driverId: driver.id,
    firstName: driver.user.firstName,
    lastName: driver.user.lastName,
    licenseNumber: driver.licenseNumber,
    licenseState: driver.licenseState,
  };
}

export async function orderScreening(driverId: string, type: ScreeningType) {
  const ctx = await ownDriverContext(driverId);

  const report = await prisma.screeningReport.create({
    data: { driverId, type, status: "IN_PROGRESS", provider: "samba_safety" },
  });

  try {
    const result =
      type === "PSP"
        ? await sambaProvider.orderPSP(ctx)
        : await sambaProvider.orderMVR(ctx);

    await prisma.screeningReport.update({
      where: { id: report.id },
      data: {
        status: "COMPLETED",
        externalRef: result.externalRef,
        violationCount: result.violationCount,
        summary: result.summary,
        resultJson: result as unknown as object,
        completedAt: new Date(),
      },
    });
  } catch {
    await prisma.screeningReport.update({
      where: { id: report.id },
      data: { status: "FAILED", summary: "Provider request failed." },
    });
  }

  revalidatePath("/company/screening");
  revalidatePath(`/company/drivers/${driverId}`);
}
