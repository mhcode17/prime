import { prisma } from "@/lib/db";
import { requireCompanyOwner } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import {
  AddManagerForm,
  ManagerPermissionsEditor,
  ManagerRowActions,
} from "./staff-ui";

export default async function StaffPage() {
  const { companyId, session } = await requireCompanyOwner();

  const staff = await prisma.user.findMany({
    where: { companyId, role: "COMPANY" },
    orderBy: [{ companyRole: "asc" }, { createdAt: "asc" }],
  });

  const owners = staff.filter((s) => s.companyRole === "OWNER");
  const managers = staff.filter((s) => s.companyRole === "MANAGER");

  return (
    <div>
      <PageHeader
        title="Team & Access"
        description="Add managers to your company and control what they can access."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Owners ({owners.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {owners.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {initials(o.firstName, o.lastName)}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {o.firstName} {o.lastName}
                        {o.id === session.userId && (
                          <span className="ml-2 text-xs text-slate-400">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{o.email}</div>
                    </div>
                    <Badge tone="purple">Owner · full access</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Managers ({managers.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {managers.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">
                  No managers yet. Add one using the form.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {managers.map((m) => (
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
                        <ManagerRowActions userId={m.id} isActive={m.isActive} />
                      </div>
                      <div className="mt-3 pl-12">
                        <ManagerPermissionsEditor userId={m.id} current={m.permissions} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add manager</CardTitle>
            </CardHeader>
            <CardContent>
              <AddManagerForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
