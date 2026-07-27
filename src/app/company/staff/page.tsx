import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import {
  AddMemberForm,
  MembershipEditor,
  GrantCompanyForm,
  MemberRowActions,
} from "./staff-ui";

export default async function StaffPage() {
  const { organizationId, session } = await requireOrgAdmin();

  const [org, companies, users] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId! } }),
    prisma.company.findMany({
      where: { organizationId: organizationId! },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId: organizationId!, role: "COMPANY" },
      include: { memberships: true },
      orderBy: [{ isOrgAdmin: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  const admins = users.filter((u) => u.isOrgAdmin);
  const members = users.filter((u) => !u.isOrgAdmin);

  return (
    <div>
      <PageHeader
        title="Team & Access"
        description={`Add people to ${org?.name ?? "your organization"} and choose which company they can access and what they can do.`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Organization admins ({admins.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {admins.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {initials(a.firstName, a.lastName)}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {a.firstName} {a.lastName}
                        {a.id === session.userId && (
                          <span className="ml-2 text-xs text-slate-400">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{a.email}</div>
                    </div>
                    <Badge tone="purple">Full access · all companies</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {members.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">
                  No members yet. Add one with the form.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {members.map((m) => {
                    const heldIds = new Set(m.memberships.map((x) => x.companyId));
                    const grantable = companies.filter((c) => !heldIds.has(c.id));
                    return (
                      <li key={m.id} className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {initials(m.firstName, m.lastName)}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900">
                              {m.firstName} {m.lastName}
                            </div>
                            <div className="text-xs text-slate-500">{m.email}</div>
                          </div>
                          <Badge tone={m.isActive ? "green" : "red"}>
                            {m.isActive ? "Active" : "Disabled"}
                          </Badge>
                          <MemberRowActions userId={m.id} isActive={m.isActive} />
                        </div>

                        <div className="mt-3 space-y-2 pl-12">
                          {m.memberships.length === 0 && (
                            <p className="text-xs text-slate-400">No company access yet.</p>
                          )}
                          {m.memberships.map((ms) => (
                            <MembershipEditor
                              key={ms.id}
                              userId={m.id}
                              companyId={ms.companyId}
                              companyName={companyName.get(ms.companyId) ?? "—"}
                              current={ms.permissions}
                            />
                          ))}
                          <GrantCompanyForm userId={m.id} companies={grantable} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add member</CardTitle>
            </CardHeader>
            <CardContent>
              <AddMemberForm companies={companies} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
