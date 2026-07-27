"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import {
  lookupByDot,
  lookupByMc,
  CarrierLookupError,
  type CarrierInfo,
} from "@/lib/integrations/carrier-lookup";
import type { CompanyStatus } from "@prisma/client";

export type CarrierLookupResult =
  | { ok: true; info: CarrierInfo }
  | { ok: false; error: string };

/** Look up carrier details from FMCSA by USDOT or MC number. */
export async function lookupCarrier(
  kind: "dot" | "mc",
  value: string,
): Promise<CarrierLookupResult> {
  await requireRole("ADMIN");
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error: "Enter a number first" };
  try {
    const info =
      kind === "dot" ? await lookupByDot(trimmed) : await lookupByMc(trimmed);
    if (!info) return { ok: false, error: "No carrier found for that number" };
    return { ok: true, info };
  } catch (e) {
    const msg =
      e instanceof CarrierLookupError
        ? e.message
        : "Lookup failed — please try again";
    return { ok: false, error: msg };
  }
}

const createCompanySchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  dotNumber: z.string().optional(),
  mcNumber: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["ACTIVE", "PENDING", "SUSPENDED"]),
  firstName: z.string().min(1, "Owner first name is required"),
  lastName: z.string().min(1, "Owner last name is required"),
  email: z.string().email("Enter a valid owner email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function createCompanyByAdmin(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  await requireRole("ADMIN");
  const parsed = createCompanySchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: d.email.toLowerCase() },
  });
  if (existing) return { error: "A user with this email already exists" };

  if (d.dotNumber) {
    const dotClash = await prisma.company.findFirst({
      where: { dotNumber: d.dotNumber },
    });
    if (dotClash) return { error: "That USDOT number is already in use" };
  }

  const company = await prisma.company.create({
    data: {
      name: d.companyName,
      dotNumber: d.dotNumber || null,
      mcNumber: d.mcNumber || null,
      city: d.city || null,
      state: d.state || null,
      phone: d.phone || null,
      status: d.status as CompanyStatus,
      staff: {
        create: {
          email: d.email.toLowerCase(),
          passwordHash: await hashPassword(d.password),
          role: "COMPANY",
          companyRole: "OWNER",
          firstName: d.firstName,
          lastName: d.lastName,
          phone: d.phone || null,
        },
      },
    },
  });

  revalidatePath("/admin/companies");
  redirect(`/admin/companies/${company.id}`);
}

export async function setCompanyStatus(
  companyId: string,
  status: CompanyStatus,
) {
  await requireRole("ADMIN");
  await prisma.company.update({
    where: { id: companyId },
    data: { status },
  });
  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${companyId}`);
}

export async function setUserActive(userId: string, isActive: boolean) {
  await requireRole("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin/users");
}
