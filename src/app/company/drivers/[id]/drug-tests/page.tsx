import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { DriverModuleHeader } from "../driver-module-header";
import { DrugTestResultActions } from "@/app/company/drug-tests/result-actions";
import { DriverDrugTestForm } from "./form";

export default async function DriverDrugTestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await getCurrentCompany("drugTests");
  const driver = await prisma.driver.findFirst({
    where: { id, companyId },
    include: { user: true, drugTests: { orderBy: { createdAt: "desc" } } },
  });
  if (!driver) notFound();

  const name = `${driver.user.firstName} ${driver.user.lastName}`;

  return (
    <div>
      <DriverModuleHeader
        driverId={driver.id}
        name={name}
        status={driver.status}
        title={`Drug Tests — ${name}`}
        description="Order DOT drug tests and record results for this driver."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Tests ({driver.drugTests.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {driver.drugTests.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No drug tests yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Scheduled</th>
                      <th className="px-5 py-3 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driver.drugTests.map((t) => (
                      <tr key={t.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3 text-slate-600">
                          {humanize(t.type)}
                          {t.labName && <div className="text-xs text-slate-400">{t.labName}</div>}
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={statusTone(t.status)}>{humanize(t.status)}</Badge>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {t.scheduledAt ? formatDateTime(t.scheduledAt) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <DrugTestResultActions id={t.id} status={t.status} />
                        </td>
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
              <CardTitle>Order drug test</CardTitle>
            </CardHeader>
            <CardContent>
              <DriverDrugTestForm driverId={driver.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
