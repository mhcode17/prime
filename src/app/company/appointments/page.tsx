import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { CreateAppointmentForm } from "./create-form";
import { AppointmentActions } from "./appt-actions";
import { CalendarClock, MapPin } from "lucide-react";

function dayKey(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function time(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default async function AppointmentsPage() {
  const { companyId } = await getCurrentCompany("appointments");

  const [drivers, appts] = await Promise.all([
    prisma.driver.findMany({
      where: { companyId, status: { not: "TERMINATED" } },
      include: { user: true },
      orderBy: { user: { firstName: "asc" } },
    }),
    prisma.appointment.findMany({
      where: { companyId },
      include: { driver: { include: { user: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const driverOpts = drivers.map((d) => ({
    id: d.id,
    name: `${d.user.firstName} ${d.user.lastName}`,
  }));

  // Group by day
  const groups = new Map<string, typeof appts>();
  for (const a of appts) {
    const key = dayKey(a.startsAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  return (
    <div>
      <PageHeader
        title="Orientation & Appointments"
        description="Create open slots for drivers to book, or assign a date directly."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {appts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-slate-500">
                No appointments yet. Create a slot using the form.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {Array.from(groups.entries()).map(([day, items]) => (
                <div key={day}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CalendarClock className="h-4 w-4 text-brand-600" />
                    {day}
                  </h3>
                  <Card>
                    <CardContent className="divide-y divide-slate-100 p-0">
                      {items.map((a) => (
                        <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">
                                {time(a.startsAt)} – {time(a.endsAt)}
                              </span>
                              <Badge tone={statusTone(a.status)}>{humanize(a.status)}</Badge>
                              <span className="text-xs text-slate-400">{humanize(a.type)}</span>
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {a.driver
                                ? `${a.driver.user.firstName} ${a.driver.user.lastName}`
                                : "Open for booking"}
                              {a.location && (
                                <span className="ml-2 inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {a.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <AppointmentActions id={a.id} status={a.status} drivers={driverOpts} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>New appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateAppointmentForm drivers={driverOpts} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
