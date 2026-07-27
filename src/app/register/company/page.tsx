import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { dashboardPathFor } from "@/lib/auth/guards";
import { CompanyRegisterForm } from "./form";
import { Truck } from "lucide-react";

export default async function RegisterCompanyPage() {
  const session = await getSession();
  if (session) redirect(dashboardPathFor(session.role));

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
          <h1 className="text-xl font-semibold text-slate-900">
            Register your company
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create the manager account. Your company will be reviewed by an
            admin.
          </p>
          <CompanyRegisterForm />
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">
          Registering as a driver?{" "}
          <Link
            href="/register/driver"
            className="font-medium text-brand-600 hover:underline"
          >
            Driver sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
