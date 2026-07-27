import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Truck, Container } from "lucide-react";
import { AssignEquipmentForm, UnassignButton } from "./assign-ui";

export default async function DriverEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await getCurrentCompany("equipment");

  const driver = await prisma.driver.findFirst({
    where: { id, companyId },
    include: { user: true },
  });
  if (!driver) notFound();

  const [active, availableTrucks, availableTrailers] = await Promise.all([
    prisma.equipmentAssignment.findFirst({
      where: { driverId: driver.id, active: true },
      include: { truck: true, trailer: true },
    }),
    prisma.truck.findMany({
      where: { companyId, status: "AVAILABLE" },
      orderBy: { unitNumber: "asc" },
    }),
    prisma.trailer.findMany({
      where: { companyId, status: "AVAILABLE" },
      orderBy: { unitNumber: "asc" },
    }),
  ]);

  return (
    <div>
      <Link href={`/company/drivers/${driver.id}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to driver
      </Link>
      <PageHeader
        title={`Equipment — ${driver.user.firstName} ${driver.user.lastName}`}
        description="Assign a truck and/or trailer to this driver."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current assignment</CardTitle>
            {active && <UnassignButton driverId={driver.id} />}
          </CardHeader>
          <CardContent>
            {active ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <Truck className="h-6 w-6 text-brand-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {active.truck ? `Truck ${active.truck.unitNumber}` : "No truck"}
                    </div>
                    {active.truck && (
                      <div className="text-xs text-slate-500">
                        {[active.truck.year, active.truck.make, active.truck.model].filter(Boolean).join(" ")}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <Container className="h-6 w-6 text-brand-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {active.trailer ? `Trailer ${active.trailer.unitNumber}` : "No trailer"}
                    </div>
                    {active.trailer && (
                      <div className="text-xs text-slate-500">{active.trailer.type}</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-4 text-sm text-slate-500">
                No equipment assigned. Use the form to assign a truck and/or
                trailer.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignEquipmentForm
              driverId={driver.id}
              trucks={availableTrucks.map((t) => ({
                id: t.id,
                label: `${t.unitNumber} — ${[t.make, t.model].filter(Boolean).join(" ") || "Truck"}`,
              }))}
              trailers={availableTrailers.map((t) => ({
                id: t.id,
                label: `${t.unitNumber} — ${t.type ?? "Trailer"}`,
              }))}
            />
            {availableTrucks.length === 0 && availableTrailers.length === 0 && (
              <p className="mt-3 text-xs text-slate-400">
                No available equipment. Add trucks/trailers or free up assigned
                ones first.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
