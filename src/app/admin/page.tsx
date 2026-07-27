import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { StatCard } from "@/components/ui/stat";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Building2, Users, Truck, Clock } from "lucide-react";

export default async function AdminDashboard() {
  const [companies, pendingCompanies, users, drivers, latest] =
    await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.driver.count(),
      prisma.company.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { _count: { select: { drivers: true, staff: true } } },
      }),
    ]);

  return (
    <div>
      <PageHeader
        title="Admin dashboard"
        description="Manage companies and users across the platform."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Companies" value={companies} icon={Building2} href="/admin/companies" />
        <StatCard label="Pending approval" value={pendingCompanies} icon={Clock} tone="yellow" href="/admin/companies?status=PENDING" />
        <StatCard label="Users" value={users} icon={Users} href="/admin/users" />
        <StatCard label="Drivers" value={drivers} icon={Truck} tone="green" />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recently registered companies</CardTitle>
            <Link href="/admin/companies" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Drivers</th>
                  <th className="px-5 py-3 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/admin/companies/${c.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(c.status)}>{humanize(c.status)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{c._count.drivers}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
                {latest.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                      No companies yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
