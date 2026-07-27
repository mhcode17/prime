"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";

export async function bookSlot(appointmentId: string) {
  const { driver } = await getCurrentDriver();

  // Only allow booking an OPEN slot that belongs to the driver's company.
  const slot = await prisma.appointment.findFirst({
    where: { id: appointmentId, companyId: driver.companyId, status: "OPEN" },
  });
  if (!slot) throw new Error("This slot is no longer available");

  await prisma.appointment.update({
    where: { id: slot.id },
    data: { driverId: driver.id, status: "BOOKED" },
  });
  revalidatePath("/driver/appointments");
  revalidatePath("/driver");
}

export async function cancelMyBooking(appointmentId: string) {
  const { driver } = await getCurrentDriver();
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, driverId: driver.id, status: "BOOKED" },
  });
  if (!appt) throw new Error("Booking not found");

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: "OPEN", driverId: null },
  });
  revalidatePath("/driver/appointments");
  revalidatePath("/driver");
}
