import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { CreateTicketForm } from "./support-ui";
import { LifeBuoy } from "lucide-react";

export default async function CompanySupportPage() {
  const { companyId } = await getCurrentCompany();

  const tickets = await prisma.supportTicket.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { messages: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Support"
        description="Contact the platform admin for help with your account."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {tickets.length === 0 ? (
            <EmptyState
              title="No tickets yet"
              description="Open a ticket to reach the platform support team."
            />
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <Link key={t.id} href={`/company/support/${t.id}`}>
                  <Card className="transition hover:border-brand-400 hover:shadow">
                    <CardContent className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <LifeBuoy className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{t.subject}</div>
                          <div className="text-xs text-slate-500">
                            {t.createdBy.firstName} {t.createdBy.lastName} ·{" "}
                            {t._count.messages} message(s) · Updated {formatDateTime(t.updatedAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone(t.priority)}>{humanize(t.priority)}</Badge>
                        <Badge tone={statusTone(t.status)}>{humanize(t.status)}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>New support ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateTicketForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
