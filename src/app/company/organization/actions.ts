"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/current";
import {
  lookupByDot,
  lookupByMc,
  CarrierLookupError,
  type CarrierInfo,
} from "@/lib/integrations/carrier-lookup";

export type CarrierLookupResult =
  | { ok: true; info: CarrierInfo }
  | { ok: false; error: string };

/** FMCSA carrier lookup for organization admins. */
export async function lookupCarrierForOrg(
  kind: "dot" | "mc",
  value: string,
): Promise<CarrierLookupResult> {
  await requireOrgAdmin();
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error: "Enter a number first" };
  try {
    const info =
      kind === "dot" ? await lookupByDot(trimmed) : await lookupByMc(trimmed);
    if (!info) return { ok: false, error: "No carrier found for that number" };
    return { ok: true, info };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof CarrierLookupError
          ? e.message
          : "Lookup failed — please try again",
    };
  }
}

const schema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  dotNumber: z.string().optional(),
  mcNumber: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
});

/** Create a new company under the admin's organization. */
export async function createOrgCompany(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const { organizationId } = await requireOrgAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  if (d.dotNumber) {
    const clash = await prisma.company.findFirst({
      where: { dotNumber: d.dotNumber },
    });
    if (clash) return { error: "That USDOT number is already in use" };
  }

  const company = await prisma.company.create({
    data: {
      name: d.companyName,
      dotNumber: d.dotNumber || null,
      mcNumber: d.mcNumber || null,
      city: d.city || null,
      state: d.state || null,
      phone: d.phone || null,
      status: "ACTIVE",
      organizationId,
    },
  });

  revalidatePath("/company/organization");
  redirect(`/company/organization?created=${company.id}`);
}
