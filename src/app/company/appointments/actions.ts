"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import type { AppointmentType, AppointmentStatus } from "@prisma/client";

export async function createAppointment(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { companyId } = await getCurrentCompany("appointments");

  const type = String(formData.get("type") ?? "ORIENTATION") as AppointmentType;
  const startsAt = String(formData.get("startsAt") ?? "");
  const durationMin = parseInt(String(formData.get("duration") ?? "120"), 10);
  const location = String(formData.get("location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const driverId = String(formData.get("driverId") ?? "");

  if (!startsAt) return { error: "Start date/time is required" };
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return { error: "Invalid start time" };
  const end = new Date(start.getTime() + durationMin * 60000);

  // If a driver is chosen, verify ownership and book directly.
  if (driverId) {
    const driver = await prisma.driver.findFirst({ where: { id: driverId, companyId } });
    if (!driver) return { error: "Driver not found" };
  }

  await prisma.appointment.create({
    data: {
      companyId,
      type,
      startsAt: start,
      endsAt: end,
      location: location || null,
      notes: notes || null,
      driverId: driverId || null,
      status: driverId ? "BOOKED" : "OPEN",
    },
  });
  revalidatePath("/company/appointments");
  return { ok: true };
}

async function assertOwn(appointmentId: string) {
  const { companyId } = await getCurrentCompany("appointments");
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, companyId },
  });
  if (!appt) throw new Error("Appointment not found");
  return appt;
}

export async function setAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
) {
  await assertOwn(appointmentId);
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status,
      // Releasing a slot clears the driver
      driverId: status === "OPEN" ? null : undefined,
    },
  });
  revalidatePath("/company/appointments");
}

export async function assignDriverToSlot(appointmentId: string, driverId: string) {
  const appt = await assertOwn(appointmentId);
  const { companyId } = await getCurrentCompany("appointments");
  const driver = await prisma.driver.findFirst({ where: { id: driverId, companyId } });
  if (!driver) throw new Error("Driver not found");
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { driverId, status: "BOOKED" },
  });
  revalidatePath("/company/appointments");
}

export async function deleteAppointment(appointmentId: string) {
  const appt = await assertOwn(appointmentId);
  await prisma.appointment.delete({ where: { id: appt.id } });
  revalidatePath("/company/appointments");
}
