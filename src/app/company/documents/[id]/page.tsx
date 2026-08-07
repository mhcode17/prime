import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { DocumentViewer } from "@/components/document-viewer";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { SendPanel } from "./send-panel";
import { PenSquare, Download, FileCheck2 } from "lucide-react";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await getCurrentCompany("documents");

  const doc = await prisma.document.findFirst({
    where: { id, companyId },
    include: {
      assignments: {
        include: { driver: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { fields: true } },
    },
  });
  if (!doc) notFound();

  const isPdf =
    doc.fileType === "application/pdf" ||
    (doc.content?.startsWith("data:application/pdf") ?? false);

  // Verification / agreement records are already-completed documents filed
  // automatically — not templates to prepare fields on or send for signature.
  // Detect via kind, or (for older records) the back-link from experience/agreement.
  const [linkedExperience, linkedAgreement] = await Promise.all([
    prisma.driverExperience.findFirst({ where: { verificationDocumentId: doc.id }, select: { id: true } }),
    prisma.driverAgreement.findFirst({ where: { agreementDocumentId: doc.id }, select: { id: true } }),
  ]);
  const isVerification =
    doc.kind === "VERIFICATION" || doc.kind === "AGREEMENT" || !!linkedExperience || !!linkedAgreement;

  const allDrivers = await prisma.driver.findMany({
    where: { companyId },
    include: { user: true },
    orderBy: { user: { firstName: "asc" } },
  });

  const assignedIds = new Set(doc.assignments.map((a) => a.driverId));
  const driversForPanel = allDrivers.map((d) => ({
    id: d.id,
    name: `${d.user.firstName} ${d.user.lastName}`,
    status: d.status,
    assigned: assignedIds.has(d.id),
  }));

  return (
    <div>
      <Link href="/company/documents" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to documents
      </Link>
      <PageHeader
        title={doc.title}
        description={doc.description ?? undefined}
        actions={
          isPdf && !isVerification ? (
            <Link href={`/company/documents/${doc.id}/fields`}>
              <Button variant="outline">
                <PenSquare className="h-4 w-4" />
                {doc._count.fields > 0
                  ? `Edit fields (${doc._count.fields})`
                  : "Prepare fields"}
              </Button>
            </Link>
          ) : isVerification ? (
            <a href={`/api/assignments/${doc.assignments[0]?.id}/pdf`}>
              <Button variant="outline">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </a>
          ) : undefined
        }
      />
      {isVerification ? (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <FileCheck2 className="h-4 w-4" />
          Completed verification record — already signed by the prior employer and filed here. No further action needed.
        </div>
      ) : (
        isPdf && doc._count.fields === 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No signature/fill fields placed yet. Click{" "}
            <span className="font-medium">Prepare fields</span> to add a signature
            box and auto-fill fields before sending.
          </div>
        )
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentViewer content={doc.content} fileType={doc.fileType} fileName={doc.fileName} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {isVerification ? `Filed for (${doc.assignments.length})` : `Recipients (${doc.assignments.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {doc.assignments.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">
                  Not sent to anyone yet. Use the panel to send it.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Driver</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Signed</th>
                      <th className="px-5 py-3 font-medium">Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.assignments.map((a) => (
                      <tr key={a.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3">
                          <Link href={`/company/drivers/${a.driverId}`} className="font-medium text-slate-900 hover:text-brand-600">
                            {a.driver.user.firstName} {a.driver.user.lastName}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={statusTone(a.status)}>{humanize(a.status)}</Badge>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {a.signedAt ? `${a.signedName ?? ""} · ${formatDateTime(a.signedAt)}` : "—"}
                        </td>
                        <td className="px-5 py-3">
                          {a.status === "SIGNED" ? (
                            <div className="flex items-center gap-3">
                              <a
                                href={`/api/assignments/${a.id}/pdf`}
                                className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                              >
                                <Download className="h-4 w-4" /> PDF
                              </a>
                              <Link
                                href={`/company/documents/${doc.id}/certificate/${a.id}`}
                                className="inline-flex items-center gap-1 text-slate-500 hover:text-brand-600"
                              >
                                <FileCheck2 className="h-4 w-4" /> Certificate
                              </Link>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>{isVerification ? "About" : "Send to drivers"}</CardTitle>
            </CardHeader>
            <CardContent>
              {isVerification ? (
                <p className="text-sm text-slate-500">
                  This is a completed Employment Verification, filed automatically from the
                  driver&apos;s employment history. It is not sent to drivers for signature.
                </p>
              ) : (
                <SendPanel documentId={doc.id} drivers={driversForPanel} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
