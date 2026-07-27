import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ScreeningOrderPanel } from "./order-panel";

export default async function ScreeningPage({
  searchParams,
}: {
  searchParams: Promise<{ driver?: string }>;
}) {
  const { companyId } = await getCurrentCompany("screening");
  const { driver } = await searchParams;

  const [drivers, reports] = await Promise.all([
    prisma.driver.findMany({
      where: { companyId, status: { not: "TERMINATED" } },
      include: { user: true },
      orderBy: { user: { firstName: "asc" } },
    }),
    prisma.screeningReport.findMany({
      where: { driver: { companyId }, ...(driver ? { driverId: driver } : {}) },
      include: { driver: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Screening — PSP / MVR"
        description="Order and review driver background screening via Samba Safety."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Reports ({reports.length})</CardTitle>
              {driver && (
                <Link href="/company/screening" className="text-sm text-brand-600 hover:underline">
                  Clear filter
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {reports.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  No screening reports yet. Order one from the panel.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Driver</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Violations</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3">
                          <Link href={`/company/drivers/${r.driverId}`} className="font-medium text-slate-900 hover:text-brand-600">
                            {r.driver.user.firstName} {r.driver.user.lastName}
                          </Link>
                          <div className="text-xs text-slate-400">{r.summary}</div>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone="blue">{r.type}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={statusTone(r.status)}>{humanize(r.status)}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          {r.violationCount != null ? (
                            <Badge tone={r.violationCount > 0 ? "red" : "green"}>
                              {r.violationCount}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-500">{formatDate(r.createdAt)}</td>
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
              <ScreeningOrderPanel
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
