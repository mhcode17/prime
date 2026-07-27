import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { dashboardPathFor } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { DriverRegisterForm } from "./form";
import { Truck } from "lucide-react";

export default async function RegisterDriverPage() {
  const session = await getSession();
  if (session) redirect(dashboardPathFor(session.role));

  const companies = await prisma.company.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, state: true },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-lg font-bold text-slate-900"
        >
          <Truck className="h-6 w-6 text-brand-600" />
          Trucking CRM
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Driver sign up</h1>
          <p className="mt-1 text-sm text-slate-500">
            Apply to a company. They&apos;ll move you through hiring.
          </p>
          <DriverRegisterForm companies={companies} />
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">
          Registering a company?{" "}
          <Link
            href="/register/company"
            className="font-medium text-brand-600 hover:underline"
          >
            Company sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
