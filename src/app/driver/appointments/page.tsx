import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { BookButton, CancelBookingButton } from "./book-button";
import { CalendarClock, MapPin } from "lucide-react";

function fmtDay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default async function DriverAppointmentsPage() {
  const { driver } = await getCurrentDriver();

  const [mine, open] = await Promise.all([
    prisma.appointment.findMany({
      where: { driverId: driver.id },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { companyId: driver.companyId, status: "OPEN", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Orientation"
        description="Book an available orientation window or view your scheduled appointments."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            My appointments
          </h2>
          {mine.length === 0 ? (
            <EmptyState title="Nothing scheduled" description="Book an open slot on the right." />
          ) : (
            <div className="space-y-3">
              {mine.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {fmtDay(a.startsAt)}, {fmtTime(a.startsAt)}
                        </span>
                        <Badge tone={statusTone(a.status)}>{humanize(a.status)}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {humanize(a.type)}
                        {a.location && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {a.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {a.status === "BOOKED" && <CancelBookingButton appointmentId={a.id} />}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Available slots
          </h2>
          {open.length === 0 ? (
            <EmptyState
              title="No open slots"
              description="Your company hasn't published any open orientation windows yet."
            />
          ) : (
            <Card>
              <CardContent className="divide-y divide-slate-100 p-0">
                {open.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <CalendarClock className="h-4 w-4 text-brand-600" />
                        {fmtDay(a.startsAt)}, {fmtTime(a.startsAt)} – {fmtTime(a.endsAt)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {humanize(a.type)}
                        {a.location && ` · ${a.location}`}
                      </div>
                    </div>
                    <BookButton appointmentId={a.id} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
