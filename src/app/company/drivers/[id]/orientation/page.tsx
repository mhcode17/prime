import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { DriverModuleHeader } from "../driver-module-header";
import { DriverAppointmentForm, AppointmentStatusButtons } from "./form";

export default async function DriverOrientationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await getCurrentCompany("appointments");
  const driver = await prisma.driver.findFirst({
    where: { id, companyId },
    include: { user: true, appointments: { orderBy: { startsAt: "asc" } } },
  });
  if (!driver) notFound();

  const name = `${driver.user.firstName} ${driver.user.lastName}`;

  return (
    <div>
      <DriverModuleHeader
        driverId={driver.id}
        name={name}
        status={driver.status}
        title={`Orientation — ${name}`}
        description="Schedule orientation and other appointments for this driver."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Appointments ({driver.appointments.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {driver.appointments.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  No appointments yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {driver.appointments.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                          {formatDateTime(a.startsAt)}
                          <Badge tone={statusTone(a.status)}>{humanize(a.status)}</Badge>
                          <span className="text-xs text-slate-400">{humanize(a.type)}</span>
                        </div>
                        {a.location && (
                          <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3 w-3" /> {a.location}
                          </div>
                        )}
                      </div>
                      <AppointmentStatusButtons id={a.id} status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Book appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <DriverAppointmentForm driverId={driver.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
