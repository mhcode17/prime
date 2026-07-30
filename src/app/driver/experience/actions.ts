"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";
import {
  lookupByName,
  CarrierLookupError,
  type CarrierSummary,
} from "@/lib/integrations/carrier-lookup";

export type { CarrierSummary };

export type CarrierSearchResult =
  | { ok: true; results: CarrierSummary[] }
  | { ok: false; error: string };

/** Autocomplete: search carriers by name via FMCSA (driver-accessible). */
export async function searchCarriers(query: string): Promise<CarrierSearchResult> {
  await getCurrentDriver();
  const q = query.trim();
  if (q.length < 2) return { ok: true, results: [] };
  try {
    return { ok: true, results: await lookupByName(q) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof CarrierLookupError ? e.message : "Search failed",
    };
  }
}

const schema = z
  .object({
    employerName: z.string().min(1, "Employer name is required"),
    position: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    isCurrent: z.string().optional(), // "on" when checked
    reasonForLeaving: z.string().optional(),
  })
  .refine((d) => d.isCurrent === "on" || !!d.endDate, {
    message: "Enter an end date, or mark this as your current job",
    path: ["endDate"],
  });

function toData(d: z.infer<typeof schema>) {
  const isCurrent = d.isCurrent === "on";
  return {
    employerName: d.employerName.trim(),
    position: d.position?.trim() || null,
    city: d.city?.trim() || null,
    state: d.state?.trim() || null,
    phone: d.phone?.trim() || null,
    email: d.email?.trim() || null,
    startDate: new Date(d.startDate),
    endDate: isCurrent || !d.endDate ? null : new Date(d.endDate),
    isCurrent,
    reasonForLeaving: d.reasonForLeaving?.trim() || null,
  };
}

export async function addExperience(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { driver } = await getCurrentDriver();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await prisma.driverExperience.create({
    data: { driverId: driver.id, ...toData(parsed.data) },
  });
  revalidatePath("/driver/experience");
  return { ok: true };
}

export async function updateExperience(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { driver } = await getCurrentDriver();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.driverExperience.findFirst({
    where: { id, driverId: driver.id },
  });
  if (!existing) return { error: "Entry not found" };

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await prisma.driverExperience.update({
    where: { id },
    data: toData(parsed.data),
  });
  revalidatePath("/driver/experience");
  return { ok: true };
}

export async function deleteExperience(id: string) {
  const { driver } = await getCurrentDriver();
  const existing = await prisma.driverExperience.findFirst({
    where: { id, driverId: driver.id },
  });
  if (!existing) throw new Error("Entry not found");
  await prisma.driverExperience.delete({ where: { id } });
  revalidatePath("/driver/experience");
}

/** Driver signs the consent authorizing this prior employer to release info. */
export async function signConsent(
  experienceId: string,
  signaturePng: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { driver } = await getCurrentDriver();
  const exp = await prisma.driverExperience.findFirst({
    where: { id: experienceId, driverId: driver.id },
  });
  if (!exp) return { error: "Entry not found" };
  if (!signaturePng || !signaturePng.startsWith("data:image")) {
    return { error: "Please sign before submitting" };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";

  await prisma.driverExperience.update({
    where: { id: exp.id },
    data: { consentSignature: signaturePng, consentSignedAt: new Date(), consentIp: ip },
  });
  revalidatePath("/driver/experience");
  return { ok: true };
}
