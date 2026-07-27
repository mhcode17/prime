import Link from "next/link";
import { Truck, Building2, User } from "lucide-react";

export default function RegisterChoicePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-lg font-bold text-slate-900"
        >
          <Truck className="h-6 w-6 text-brand-600" />
          Trucking CRM
        </Link>
        <h1 className="text-center text-xl font-semibold text-slate-900">
          Create your account
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Choose how you want to use the platform.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/register/company"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-400 hover:shadow"
          >
            <Building2 className="h-9 w-9 text-brand-600" />
            <h2 className="mt-4 font-semibold text-slate-900">A trucking company</h2>
            <p className="mt-1 text-sm text-slate-600">
              Manage drivers, documents, screening, and equipment.
            </p>
          </Link>
          <Link
            href="/register/driver"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-400 hover:shadow"
          >
            <User className="h-9 w-9 text-brand-600" />
            <h2 className="mt-4 font-semibold text-slate-900">A driver</h2>
            <p className="mt-1 text-sm text-slate-600">
              Apply to a company, sign documents, and book orientation.
            </p>
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
