import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { DriverModuleHeader } from "../driver-module-header";
import { DriverClearinghousePanel } from "./panel";

export default async function DriverClearinghousePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await getCurrentCompany("clearinghouse");
  const driver = await prisma.driver.findFirst({
    where: { id, companyId },
    include: { user: true, clearinghouseQueries: { orderBy: { createdAt: "desc" } } },
  });
  if (!driver) notFound();

  const name = `${driver.user.firstName} ${driver.user.lastName}`;

  return (
    <div>
      <DriverModuleHeader
        driverId={driver.id}
        name={name}
        status={driver.status}
        title={`Clearinghouse — ${name}`}
        description="Submit and review FMCSA Clearinghouse queries for this driver."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Queries ({driver.clearinghouseQueries.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {driver.clearinghouseQueries.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No queries yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Result</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driver.clearinghouseQueries.map((q) => (
                      <tr key={q.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3 text-slate-600">
                          {humanize(q.type)}
                          {q.notes && <div className="text-xs text-slate-400">{q.notes}</div>}
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={statusTone(q.status)}>{humanize(q.status)}</Badge>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{formatDate(q.createdAt)}</td>
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
              <CardTitle>New query</CardTitle>
            </CardHeader>
            <CardContent>
              <DriverClearinghousePanel driverId={driver.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
