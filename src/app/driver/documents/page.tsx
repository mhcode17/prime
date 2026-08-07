import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { FileText, PenLine, FileSignature } from "lucide-react";

export default async function DriverDocumentsPage() {
  const { driver } = await getCurrentDriver();

  const [assignments, agreements] = await Promise.all([
    prisma.documentAssignment.findMany({
      where: { driverId: driver.id, status: { not: "VOIDED" } },
      orderBy: { createdAt: "desc" },
      include: { document: true },
    }),
    prisma.driverAgreement.findMany({
      where: { driverId: driver.id, status: { not: "VOIDED" } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const toSign = assignments.filter((a) => ["SENT", "VIEWED"].includes(a.status));
  const done = assignments.filter((a) => !["SENT", "VIEWED"].includes(a.status));
  const agToSign = agreements.filter((a) => a.status === "SENT" && a.token);
  const agSigned = agreements.filter((a) => a.status === "SIGNED");
  const nothing = assignments.length === 0 && agreements.length === 0;

  return (
    <div>
      <PageHeader
        title="Documents to Sign"
        description="Review and electronically sign documents from your company."
      />

      {nothing ? (
        <EmptyState
          title="No documents yet"
          description="When your company sends you documents to sign, they'll show up here."
        />
      ) : (
        <div className="space-y-6">
          {agToSign.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Agreements to sign ({agToSign.length})
              </h2>
              <div className="space-y-3">
                {agToSign.map((a) => (
                  <a key={a.id} href={`/agreement/${a.token}`}>
                    <Card className="border-yellow-200 bg-yellow-50/40 transition hover:shadow">
                      <CardContent className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700">
                            <FileSignature className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">Driver Independent Contractor Agreement</div>
                            <div className="text-xs text-slate-500">Sent {formatDate(a.createdAt)} · tap to review &amp; sign</div>
                          </div>
                        </div>
                        <Badge tone="blue">Sent</Badge>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </section>
          )}

          {agSigned.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Signed agreements ({agSigned.length})
              </h2>
              <div className="space-y-3">
                {agSigned.map((a) => (
                  <a key={a.id} href={`/api/agreement/${a.token}/pdf`} target="_blank" rel="noreferrer">
                    <Card className="transition hover:shadow">
                      <CardContent className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <FileSignature className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">Driver Independent Contractor Agreement</div>
                            <div className="text-xs text-slate-500">
                              {a.signedAt ? `Signed ${formatDate(a.signedAt)}` : "Signed"}
                            </div>
                          </div>
                        </div>
                        <Badge tone="green">Signed</Badge>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </section>
          )}

          {toSign.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Action needed ({toSign.length})
              </h2>
              <div className="space-y-3">
                {toSign.map((a) => (
                  <Link key={a.id} href={`/driver/documents/${a.id}`}>
                    <Card className="border-yellow-200 bg-yellow-50/40 transition hover:shadow">
                      <CardContent className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700">
                            <PenLine className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{a.document.title}</div>
                            <div className="text-xs text-slate-500">
                              Sent {formatDate(a.createdAt)}
                            </div>
                          </div>
                        </div>
                        <Badge tone={statusTone(a.status)}>{humanize(a.status)}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Completed
              </h2>
              <div className="space-y-3">
                {done.map((a) => (
                  <Link key={a.id} href={`/driver/documents/${a.id}`}>
                    <Card className="transition hover:shadow">
                      <CardContent className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{a.document.title}</div>
                            <div className="text-xs text-slate-500">
                              {a.signedAt ? `Signed ${formatDate(a.signedAt)}` : humanize(a.status)}
                            </div>
                          </div>
                        </div>
                        <Badge tone={statusTone(a.status)}>{humanize(a.status)}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
