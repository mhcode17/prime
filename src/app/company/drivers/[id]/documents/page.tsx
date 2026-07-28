import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { Download } from "lucide-react";
import { DriverModuleHeader } from "../driver-module-header";
import { SendDocToDriver } from "./send-panel";

export default async function DriverDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await getCurrentCompany("documents");

  const driver = await prisma.driver.findFirst({
    where: { id, companyId },
    include: {
      user: true,
      documentAssignments: {
        include: { document: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!driver) notFound();

  const assignedDocIds = new Set(driver.documentAssignments.map((a) => a.documentId));
  const sendable = await prisma.document.findMany({
    where: { companyId, id: { notIn: Array.from(assignedDocIds) } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });

  const name = `${driver.user.firstName} ${driver.user.lastName}`;

  return (
    <div>
      <DriverModuleHeader
        driverId={driver.id}
        name={name}
        status={driver.status}
        title={`Documents — ${name}`}
        description="Send documents to this driver and track signatures."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sent documents ({driver.documentAssignments.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {driver.documentAssignments.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  Nothing sent yet. Use the panel to send a document.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Document</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Signed</th>
                      <th className="px-5 py-3 font-medium">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driver.documentAssignments.map((a) => (
                      <tr key={a.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3">
                          <Link href={`/company/documents/${a.documentId}`} className="font-medium text-slate-900 hover:text-brand-600">
                            {a.document.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={statusTone(a.status)}>{humanize(a.status)}</Badge>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {a.signedAt ? formatDateTime(a.signedAt) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          {a.status === "SIGNED" ? (
                            <a href={`/api/assignments/${a.id}/pdf`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                              <Download className="h-4 w-4" /> PDF
                            </a>
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
              <CardTitle>Send a document</CardTitle>
            </CardHeader>
            <CardContent>
              <SendDocToDriver driverId={driver.id} documents={sendable} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
