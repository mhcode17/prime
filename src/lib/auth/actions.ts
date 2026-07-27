"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./session";
import { dashboardPathFor } from "./guards";

export type ActionState = { error?: string } | undefined;

// ── Login ──────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user || !user.isActive) {
    return { error: "Invalid credentials" };
  }
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return { error: "Invalid credentials" };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    companyId: user.companyId,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
  });

  redirect(dashboardPathFor(user.role));
}

// ── Company registration ───────────────────────────────────────
const companySchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  dotNumber: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerCompanyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = companySchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: d.email.toLowerCase() },
  });
  if (existing) return { error: "An account with this email already exists" };

  const company = await prisma.company.create({
    data: {
      name: d.companyName,
      dotNumber: d.dotNumber || null,
      status: "PENDING",
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
    include: { staff: true },
  });

  const user = company.staff[0];
  await createSession({
    userId: user.id,
    role: user.role,
    companyId: company.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
  });
  redirect("/company");
}

// ── Driver registration ────────────────────────────────────────
const driverSchema = z.object({
  companyId: z.string().min(1, "Please choose a company"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerDriverAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = driverSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: d.email.toLowerCase() },
  });
  if (existing) return { error: "An account with this email already exists" };

  const company = await prisma.company.findUnique({
    where: { id: d.companyId },
  });
  if (!company) return { error: "Selected company not found" };

  const user = await prisma.user.create({
    data: {
      email: d.email.toLowerCase(),
      passwordHash: await hashPassword(d.password),
      role: "DRIVER",
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone || null,
      driverProfile: {
        create: {
          companyId: company.id,
          status: "PENDING",
        },
      },
    },
  });

  await createSession({
    userId: user.id,
    role: user.role,
    companyId: null,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
  });
  redirect("/driver");
}

// ── Logout ─────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
