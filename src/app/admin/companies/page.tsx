import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { CompanyStatusActions } from "./company-actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { CompanyStatus } from "@prisma/client";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status as CompanyStatus | undefined;

  const companies = await prisma.company.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { drivers: true, staff: true } } },
  });

  const tabs: { label: string; value?: CompanyStatus }[] = [
    { label: "All" },
    { label: "Pending", value: "PENDING" },
    { label: "Active", value: "ACTIVE" },
    { label: "Suspended", value: "SUSPENDED" },
  ];

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Approve, suspend, and manage registered carriers."
        actions={
          <Link href="/admin/companies/new">
            <Button>
              <Plus className="h-4 w-4" /> New company
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex gap-2">
        {tabs.map((t) => {
          const active = filter === t.value || (!filter && !t.value);
          return (
            <Link
              key={t.label}
              href={t.value ? `/admin/companies?status=${t.value}` : "/admin/companies"}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                active ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

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
                  <th className="px-5 py-3 font-medium">Registered</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/admin/companies/${c.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{c.dotNumber ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(c.status)}>{humanize(c.status)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{c._count.drivers}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3">
                      <CompanyStatusActions companyId={c.id} status={c.status} />
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                      No companies found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
