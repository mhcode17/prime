import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { DrugTestOrderForm } from "./order-form";
import { DrugTestResultActions } from "./result-actions";

export default async function DrugTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ driver?: string }>;
}) {
  const { companyId } = await getCurrentCompany("drugTests");
  const { driver } = await searchParams;

  const [drivers, tests] = await Promise.all([
    prisma.driver.findMany({
      where: { companyId, status: { not: "TERMINATED" } },
      include: { user: true },
      orderBy: { user: { firstName: "asc" } },
    }),
    prisma.drugTest.findMany({
      where: { driver: { companyId }, ...(driver ? { driverId: driver } : {}) },
      include: { driver: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Drug Tests"
        description="Order DOT drug tests and record their results."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Tests ({tests.length})</CardTitle>
              {driver && (
                <Link href="/company/drug-tests" className="text-sm text-brand-600 hover:underline">
                  Clear filter
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {tests.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No drug tests yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Driver</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Scheduled</th>
                      <th className="px-5 py-3 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr key={t.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3">
                          <Link href={`/company/drivers/${t.driverId}`} className="font-medium text-slate-900 hover:text-brand-600">
                            {t.driver.user.firstName} {t.driver.user.lastName}
                          </Link>
                          {t.labName && <div className="text-xs text-slate-400">{t.labName}</div>}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{humanize(t.type)}</td>
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
              <DrugTestOrderForm
                drivers={drivers.map((d) => ({
                  id: d.id,
                  name: `${d.user.firstName} ${d.user.lastName}`,
                }))}
                defaultDriver={driver}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
