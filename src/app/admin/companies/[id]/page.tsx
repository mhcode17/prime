import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { CompanyStatusActions } from "../company-actions";

export default async function AdminCompanyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      staff: true,
      drivers: { include: { user: true } },
    },
  });
  if (!company) notFound();

  return (
    <div>
      <PageHeader
        title={company.name}
        description={`USDOT ${company.dotNumber ?? "—"} · Registered ${formatDate(company.createdAt)}`}
        actions={<CompanyStatusActions companyId={company.id} status={company.status} />}
      />

      <div className="mb-6">
        <Badge tone={statusTone(company.status)}>{humanize(company.status)}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Staff ({company.staff.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {company.staff.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-900">{s.firstName} {s.lastName}</span>
                  <span className="text-slate-500">{s.email}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drivers ({company.drivers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {company.drivers.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No drivers yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {company.drivers.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-900">
                      {d.user.firstName} {d.user.lastName}
                    </span>
                    <Badge tone={statusTone(d.status)}>{humanize(d.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
