import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { AddTrailerForm, TrailerRowActions } from "./trailer-ui";

export default async function TrailersPage() {
  const { companyId } = await getCurrentCompany("equipment");

  const trailers = await prisma.trailer.findMany({
    where: { companyId },
    orderBy: { unitNumber: "asc" },
    include: {
      assignments: {
        where: { active: true },
        include: { driver: { include: { user: true } } },
      },
    },
  });

  return (
    <div>
      <PageHeader title="Trailers" description="Manage your fleet of trailers." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Unit</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Assigned to</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {trailers.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-slate-900">{t.unitNumber}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {t.type || "—"}
                        {t.plate && <div className="text-xs text-slate-400">Plate {t.plate}</div>}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {t.assignments[0]
                          ? `${t.assignments[0].driver.user.firstName} ${t.assignments[0].driver.user.lastName}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={statusTone(t.status)}>{humanize(t.status)}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <TrailerRowActions id={t.id} status={t.status} />
                      </td>
                    </tr>
                  ))}
                  {trailers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        No trailers yet. Add one on the right.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add trailer</CardTitle>
            </CardHeader>
            <CardContent>
              <AddTrailerForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
