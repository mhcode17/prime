import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function DriverScreeningPage() {
  const { driver } = await getCurrentDriver();

  const [screenings, drugTests, clearinghouse] = await Promise.all([
    prisma.screeningReport.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.drugTest.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.clearinghouseQuery.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const empty =
    screenings.length === 0 && drugTests.length === 0 && clearinghouse.length === 0;

  return (
    <div>
      <PageHeader
        title="Screening & Tests"
        description="Background checks, drug tests, and Clearinghouse results run by your company."
      />

      {empty ? (
        <EmptyState
          title="Nothing here yet"
          description="When your company runs screening or tests, results will appear here."
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Background screening (PSP / MVR)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {screenings.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">No screening reports.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {screenings.map((s) => (
                    <li key={s.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {s.type} · {s.summary}
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(s.createdAt)}</div>
                      </div>
                      <Badge tone={statusTone(s.status)}>{humanize(s.status)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Drug tests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {drugTests.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">No drug tests.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {drugTests.map((t) => (
                    <li key={t.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{humanize(t.type)}</div>
                        <div className="text-xs text-slate-500">
                          {t.labName ? `${t.labName} · ` : ""}
                          {t.scheduledAt ? formatDateTime(t.scheduledAt) : formatDate(t.createdAt)}
                        </div>
                      </div>
                      <Badge tone={statusTone(t.status)}>{humanize(t.status)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clearinghouse</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {clearinghouse.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">No Clearinghouse queries.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {clearinghouse.map((q) => (
                    <li key={q.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{humanize(q.type)}</div>
                        <div className="text-xs text-slate-500">{q.notes ?? formatDate(q.createdAt)}</div>
                      </div>
                      <Badge tone={statusTone(q.status)}>{humanize(q.status)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
