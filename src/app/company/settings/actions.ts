"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompanyOwner } from "@/lib/current";

const schema = z.object({
  name: z.string().min(2, "Company name is required"),
  dotNumber: z.string().optional(),
  mcNumber: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export async function updateCompany(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { companyId } = await requireCompanyOwner();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  // dotNumber is unique; guard against collisions with other companies.
  if (d.dotNumber) {
    const clash = await prisma.company.findFirst({
      where: { dotNumber: d.dotNumber, NOT: { id: companyId } },
    });
    if (clash) return { error: "That USDOT number is already in use" };
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: d.name,
      dotNumber: d.dotNumber || null,
      mcNumber: d.mcNumber || null,
      phone: d.phone || null,
      address: d.address || null,
      city: d.city || null,
      state: d.state || null,
      zip: d.zip || null,
    },
  });
  revalidatePath("/company/settings");
  revalidatePath("/company");
  return { ok: true };
}

const MAX_LOGO_BYTES = 8_000_000; // 8 MB
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg"];

/** Upload (or replace) the company logo. Stored as a data URL on the company. */
export async function updateCompanyLogo(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { companyId } = await requireCompanyOwner();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image file." };
  }
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return { error: "Logo must be a PNG or JPEG image." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "Logo is too large (max 8 MB)." };
  }

  const mime = file.type === "image/jpg" ? "image/jpeg" : file.type;
  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

  await prisma.company.update({ where: { id: companyId }, data: { logo: dataUrl } });
  revalidatePath("/company/settings");
  revalidatePath("/company");
  return { ok: true };
}

/** Remove the company logo. */
export async function removeCompanyLogo(): Promise<{ error?: string; ok?: boolean }> {
  const { companyId } = await requireCompanyOwner();
  await prisma.company.update({ where: { id: companyId }, data: { logo: null } });
  revalidatePath("/company/settings");
  revalidatePath("/company");
  return { ok: true };
}
