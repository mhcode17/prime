import Link from "next/link";
import { getCurrentDriver } from "@/lib/current";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat";
import { formatDateTime } from "@/lib/utils";
import {
  FileSignature,
  CalendarClock,
  CheckCircle2,
  Circle,
  Truck,
} from "lucide-react";

export default async function DriverDashboard() {
  const { driver } = await getCurrentDriver();

  const [docsToSign, nextAppointment, screenings, equipment] = await Promise.all([
    prisma.documentAssignment.count({
      where: { driverId: driver.id, status: { in: ["SENT", "VIEWED"] } },
    }),
    prisma.appointment.findFirst({
      where: { driverId: driver.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.screeningReport.findMany({ where: { driverId: driver.id } }),
    prisma.equipmentAssignment.findFirst({
      where: { driverId: driver.id, active: true },
      include: { truck: true, trailer: true },
    }),
  ]);

  const drugTest = await prisma.drugTest.findFirst({
    where: { driverId: driver.id },
    orderBy: { createdAt: "desc" },
  });

  // Onboarding checklist
  const steps = [
    { label: "Account created", done: true },
    { label: "Documents signed", done: docsToSign === 0 },
    {
      label: "Screening completed",
      done: screenings.length > 0 && screenings.every((s) => s.status === "COMPLETED"),
    },
    {
      label: "Drug test completed",
      done: drugTest?.status === "COMPLETED_NEGATIVE",
    },
    { label: "Orientation scheduled", done: !!nextAppointment },
    { label: "Fully hired", done: driver.status === "ACTIVE" },
  ];
  const completed = steps.filter((s) => s.done).length;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${driver.user.firstName}`}
        description={`Your hiring status at ${driver.company.name}.`}
        actions={<Badge tone={statusTone(driver.status)}>{humanize(driver.status)}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Documents to sign" value={docsToSign} icon={FileSignature} tone={docsToSign ? "yellow" : "green"} href="/driver/documents" />
        <StatCard
          label="Next orientation"
          value={nextAppointment ? formatDateTime(nextAppointment.startsAt).split(",")[0] : "—"}
          icon={CalendarClock}
          href="/driver/appointments"
        />
        <StatCard
          label="Equipment"
          value={equipment?.truck?.unitNumber ? `Truck ${equipment.truck.unitNumber}` : "None"}
          icon={Truck}
          href="/driver/equipment"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding progress</CardTitle>
            <span className="text-sm text-slate-500">
              {completed}/{steps.length}
            </span>
          </CardHeader>
          <CardContent>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${(completed / steps.length) * 100}%` }}
              />
            </div>
            <ul className="space-y-2">
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-2 text-sm">
                  {s.done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300" />
                  )}
                  <span className={s.done ? "text-slate-900" : "text-slate-500"}>
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next orientation</CardTitle>
            <Link href="/driver/appointments" className="text-sm text-brand-600 hover:underline">
              Manage
            </Link>
          </CardHeader>
          <CardContent>
            {nextAppointment ? (
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {formatDateTime(nextAppointment.startsAt)}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {humanize(nextAppointment.type)}
                  {nextAppointment.location ? ` · ${nextAppointment.location}` : ""}
                </div>
              </div>
            ) : (
              <p className="py-4 text-sm text-slate-500">
                No orientation scheduled yet.{" "}
                <Link href="/driver/appointments" className="text-brand-600 hover:underline">
                  Book an open slot →
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
