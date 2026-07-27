import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpenCompanyButton } from "./open-button";
import { Plus, Building2 } from "lucide-react";

export default async function OrganizationPage() {
  const { organizationId, companyId: activeId } = await requireOrgAdmin();

  const [org, companies] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId! } }),
    prisma.company.findMany({
      where: { organizationId: organizationId! },
      orderBy: { name: "asc" },
      include: { _count: { select: { drivers: true, memberships: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Companies"
        description={`All companies in ${org?.name ?? "your organization"}. You have full access to each.`}
        actions={
          <Link href="/company/organization/new">
            <Button>
              <Plus className="h-4 w-4" /> Add company
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">USDOT</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Drivers</th>
                  <th className="px-5 py-3 font-medium">Team</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 font-medium text-slate-900">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {c.name}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{c.dotNumber ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(c.status)}>{humanize(c.status)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{c._count.drivers}</td>
                    <td className="px-5 py-3 text-slate-600">{c._count.memberships}</td>
                    <td className="px-5 py-3 text-right">
                      <OpenCompanyButton companyId={c.id} active={c.id === activeId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
