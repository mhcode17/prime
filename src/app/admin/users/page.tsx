import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, humanize } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { UserActiveToggle } from "./user-actions";
import type { Role } from "@prisma/client";

const roleTone: Record<Role, "purple" | "blue" | "gray"> = {
  ADMIN: "purple",
  COMPANY: "blue",
  DRIVER: "gray",
};

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader title="Users" description="All accounts on the platform." />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Active</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <Badge tone={roleTone[u.role]}>{humanize(u.role)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{u.company?.name ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={u.isActive ? "green" : "red"}>
                        {u.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      {u.role !== "ADMIN" && (
                        <UserActiveToggle userId={u.id} isActive={u.isActive} />
                      )}
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
