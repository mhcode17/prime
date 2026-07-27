import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { StatCard } from "@/components/ui/stat";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import {
  Users,
  UserPlus,
  UserX,
  FileSignature,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";

export default async function CompanyDashboard() {
  const session = await requireRole("COMPANY");
  const companyId = session.companyId!;

  const [
    total,
    pending,
    active,
    terminated,
    docsAwaiting,
    upcoming,
    recentScreenings,
  ] = await Promise.all([
    prisma.driver.count({ where: { companyId } }),
    prisma.driver.count({ where: { companyId, status: "PENDING" } }),
    prisma.driver.count({ where: { companyId, status: "ACTIVE" } }),
    prisma.driver.count({ where: { companyId, status: "TERMINATED" } }),
    prisma.documentAssignment.count({
      where: { document: { companyId }, status: { in: ["SENT", "VIEWED"] } },
    }),
    prisma.appointment.findMany({
      where: { companyId, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { driver: { include: { user: true } } },
    }),
    prisma.screeningReport.findMany({
      where: { driver: { companyId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { driver: { include: { user: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your fleet and hiring pipeline."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total drivers" value={total} icon={Users} href="/company/drivers" />
        <StatCard label="Pending hiring" value={pending} icon={UserPlus} tone="yellow" href="/company/drivers/pending" />
        <StatCard label="Active drivers" value={active} icon={Users} tone="green" href="/company/drivers" />
        <StatCard label="Terminated" value={terminated} icon={UserX} tone="red" href="/company/drivers/terminated" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming orientation</CardTitle>
            <Link href="/company/appointments" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No upcoming appointments.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <CalendarClock className="h-5 w-5 text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {a.driver
                            ? `${a.driver.user.firstName} ${a.driver.user.lastName}`
                            : "Open slot"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(a.startsAt)} · {humanize(a.type)}
                        </div>
                      </div>
                    </div>
                    <Badge tone={statusTone(a.status)}>{humanize(a.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent screening activity</CardTitle>
            <Link href="/company/screening" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentScreenings.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No screening requests yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentScreenings.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {s.driver.user.firstName} {s.driver.user.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {s.type} · {formatDateTime(s.createdAt)}
                        </div>
                      </div>
                    </div>
                    <Badge tone={statusTone(s.status)}>{humanize(s.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Documents awaiting signature</CardTitle>
            <Link href="/company/documents" className="text-sm text-brand-600 hover:underline">
              Manage documents
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <FileSignature className="h-8 w-8 text-brand-500" />
              <p className="text-sm text-slate-600">
                <span className="text-lg font-bold text-slate-900">{docsAwaiting}</span>{" "}
                document{docsAwaiting === 1 ? "" : "s"} sent to drivers still
                awaiting a signature.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
