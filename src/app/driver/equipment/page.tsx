import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Truck, Container } from "lucide-react";

export default async function DriverEquipmentPage() {
  const { driver } = await getCurrentDriver();

  const active = await prisma.equipmentAssignment.findFirst({
    where: { driverId: driver.id, active: true },
    include: { truck: true, trailer: true },
  });

  return (
    <div>
      <PageHeader title="My Equipment" description="The truck and trailer assigned to you." />

      {!active || (!active.truck && !active.trailer) ? (
        <EmptyState
          title="No equipment assigned"
          description="Your company hasn't assigned a truck or trailer to you yet."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Truck</div>
                {active.truck ? (
                  <>
                    <div className="text-lg font-semibold text-slate-900">
                      {active.truck.unitNumber}
                    </div>
                    <div className="text-sm text-slate-500">
                      {[active.truck.year, active.truck.make, active.truck.model].filter(Boolean).join(" ") || "—"}
                    </div>
                    {active.truck.plate && (
                      <div className="text-xs text-slate-400">Plate {active.truck.plate}</div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-slate-500">None</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Container className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Trailer</div>
                {active.trailer ? (
                  <>
                    <div className="text-lg font-semibold text-slate-900">
                      {active.trailer.unitNumber}
                    </div>
                    <div className="text-sm text-slate-500">{active.trailer.type ?? "—"}</div>
                    {active.trailer.plate && (
                      <div className="text-xs text-slate-400">Plate {active.trailer.plate}</div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-slate-500">None</div>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-slate-400 sm:col-span-2">
            Assigned {formatDate(active.assignedAt)}.
          </p>
        </div>
      )}
    </div>
  );
}
