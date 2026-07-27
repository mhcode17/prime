"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { clearinghouseProvider } from "@/lib/integrations/clearinghouse";
import type { ClearinghouseQueryType } from "@prisma/client";

export async function orderClearinghouse(
  driverId: string,
  type: ClearinghouseQueryType,
) {
  const { companyId } = await getCurrentCompany("clearinghouse");
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, companyId },
    include: { user: true },
  });
  if (!driver) throw new Error("Driver not found");

  const query = await prisma.clearinghouseQuery.create({
    data: { driverId, type, status: "REQUESTED" },
  });

  try {
    const result = await clearinghouseProvider.query(
      {
        driverId: driver.id,
        firstName: driver.user.firstName,
        lastName: driver.user.lastName,
        licenseNumber: driver.licenseNumber,
        licenseState: driver.licenseState,
      },
      type,
    );
    await prisma.clearinghouseQuery.update({
      where: { id: query.id },
      data: {
        status: result.status,
        resultJson: result as unknown as object,
        notes: result.summary,
        completedAt: new Date(),
      },
    });
  } catch {
    await prisma.clearinghouseQuery.update({
      where: { id: query.id },
      data: { status: "REQUESTED", notes: "Provider request failed." },
    });
  }

  revalidatePath("/company/clearinghouse");
  revalidatePath(`/company/drivers/${driverId}`);
}
