import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ClearinghouseOrderPanel } from "./order-panel";

export default async function ClearinghousePage({
  searchParams,
}: {
  searchParams: Promise<{ driver?: string }>;
}) {
  const { companyId } = await getCurrentCompany("clearinghouse");
  const { driver } = await searchParams;

  const [drivers, queries] = await Promise.all([
    prisma.driver.findMany({
      where: { companyId, status: { not: "TERMINATED" } },
      include: { user: true },
      orderBy: { user: { firstName: "asc" } },
    }),
    prisma.clearinghouseQuery.findMany({
      where: { driver: { companyId }, ...(driver ? { driverId: driver } : {}) },
      include: { driver: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="FMCSA Clearinghouse"
        description="Submit and review drug & alcohol Clearinghouse queries."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Queries ({queries.length})</CardTitle>
              {driver && (
                <Link href="/company/clearinghouse" className="text-sm text-brand-600 hover:underline">
                  Clear filter
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {queries.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No queries yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Driver</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Result</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queries.map((q) => (
                      <tr key={q.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3">
                          <Link href={`/company/drivers/${q.driverId}`} className="font-medium text-slate-900 hover:text-brand-600">
                            {q.driver.user.firstName} {q.driver.user.lastName}
                          </Link>
                          {q.notes && <div className="text-xs text-slate-400">{q.notes}</div>}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{humanize(q.type)}</td>
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
              <ClearinghouseOrderPanel
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
