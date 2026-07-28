import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { DriverModuleHeader } from "../driver-module-header";
import { DriverScreeningActions } from "./screening-actions";

export default async function DriverScreeningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await getCurrentCompany("screening");
  const driver = await prisma.driver.findFirst({
    where: { id, companyId },
    include: { user: true, screenings: { orderBy: { createdAt: "desc" } } },
  });
  if (!driver) notFound();

  const name = `${driver.user.firstName} ${driver.user.lastName}`;

  return (
    <div>
      <DriverModuleHeader
        driverId={driver.id}
        name={name}
        status={driver.status}
        title={`Screening — ${name}`}
        description="Order and review PSP / MVR reports for this driver."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Reports ({driver.screenings.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {driver.screenings.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  No screening reports yet.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Violations</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driver.screenings.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3">
                          <Badge tone="blue">{s.type}</Badge>
                          <div className="mt-0.5 text-xs text-slate-400">{s.summary}</div>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={statusTone(s.status)}>{humanize(s.status)}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          {s.violationCount != null ? (
                            <Badge tone={s.violationCount > 0 ? "red" : "green"}>
                              {s.violationCount}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{formatDate(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order screening</CardTitle>
            </CardHeader>
            <CardContent>
              <DriverScreeningActions driverId={driver.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
