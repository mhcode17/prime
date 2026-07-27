import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { dashboardPathFor } from "@/lib/auth/guards";
import { LoginForm } from "./login-form";
import { Truck } from "lucide-react";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(dashboardPathFor(session.role));

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-lg font-bold text-slate-900"
        >
          <Truck className="h-6 w-6 text-brand-600" />
          Trucking CRM
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back. Enter your credentials to continue.
          </p>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
