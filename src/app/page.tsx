import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { dashboardPathFor } from "@/lib/auth/guards";
import { Button } from "@/components/ui/button";
import {
  Truck,
  FileSignature,
  ShieldCheck,
  CalendarClock,
  MessagesSquare,
  ClipboardList,
} from "lucide-react";

export default async function Home() {
  const session = await getSession();
  if (session) redirect(dashboardPathFor(session.role));

  const features = [
    { icon: ClipboardList, title: "Driver onboarding", desc: "Track applicants from pending to active or terminated." },
    { icon: FileSignature, title: "E-sign documents", desc: "Send documents for drivers to sign — DocuSign-style." },
    { icon: ShieldCheck, title: "PSP / MVR & Clearinghouse", desc: "Order screening and FMCSA Clearinghouse queries." },
    { icon: CalendarClock, title: "Orientation scheduling", desc: "Drivers self-book open slots or companies assign them." },
    { icon: Truck, title: "Equipment", desc: "Assign trucks and trailers to your drivers." },
    { icon: MessagesSquare, title: "Messaging", desc: "Direct chat between companies and drivers." },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Truck className="h-6 w-6 text-brand-600" />
          Trucking CRM
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="outline">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          The all-in-one CRM for trucking carriers
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Hire and manage drivers, send documents to sign, run PSP/MVR and
          Clearinghouse checks, schedule orientation, assign equipment, and
          message drivers — all in one place.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/register/company">
            <Button size="lg">Register your company</Button>
          </Link>
          <Link href="/register/driver">
            <Button size="lg" variant="outline">
              I&apos;m a driver
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <f.icon className="h-8 w-8 text-brand-600" />
            <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
