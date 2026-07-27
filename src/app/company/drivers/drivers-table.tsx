import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/shell/page-header";
import { formatDate, initials } from "@/lib/utils";
import type { DriverStatus } from "@prisma/client";

export async function DriversTable({
  companyId,
  status,
}: {
  companyId: string;
  status?: DriverStatus;
}) {
  const drivers = await prisma.driver.findMany({
    where: { companyId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      _count: {
        select: {
          documentAssignments: { where: { status: { in: ["SENT", "VIEWED"] } } },
        },
      },
    },
  });

  if (drivers.length === 0) {
    return (
      <EmptyState
        title="No drivers here yet"
        description={
          status === "PENDING"
            ? "Drivers who register and apply to your company will appear here."
            : "Drivers will appear here once added."
        }
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Driver</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">License</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Docs pending</th>
                <th className="px-5 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/company/drivers/${d.id}`} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                        {initials(d.user.firstName, d.user.lastName)}
                      </span>
                      <span className="font-medium text-slate-900 hover:text-brand-600">
                        {d.user.firstName} {d.user.lastName}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    <div>{d.user.email}</div>
                    <div className="text-xs text-slate-400">{d.user.phone ?? "—"}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {d.licenseNumber ? `${d.licenseState ?? ""} ${d.licenseNumber}` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone(d.status)}>{humanize(d.status)}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {d._count.documentAssignments > 0 ? (
                      <Badge tone="yellow">{d._count.documentAssignments}</Badge>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
