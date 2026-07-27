import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { CreateDocumentForm } from "./create-form";
import { FileText } from "lucide-react";

export default async function DocumentsPage() {
  const { companyId } = await getCurrentCompany("documents");

  const documents = await prisma.document.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      assignments: { select: { status: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Create documents and send them to drivers to e-sign."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {documents.length === 0 ? (
            <EmptyState
              title="No documents yet"
              description="Create your first document using the form on the right."
            />
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const total = doc.assignments.length;
                const signed = doc.assignments.filter((a) => a.status === "SIGNED").length;
                const pending = doc.assignments.filter((a) =>
                  ["SENT", "VIEWED"].includes(a.status),
                ).length;
                return (
                  <Link key={doc.id} href={`/company/documents/${doc.id}`}>
                    <Card className="transition hover:border-brand-400 hover:shadow">
                      <CardContent className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{doc.title}</div>
                            <div className="text-xs text-slate-500">
                              Created {formatDate(doc.createdAt)}
                              {doc.fileName ? ` · ${doc.fileName}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {signed > 0 && <Badge tone="green">{signed} signed</Badge>}
                          {pending > 0 && <Badge tone="yellow">{pending} pending</Badge>}
                          {total === 0 && <Badge tone="gray">Not sent</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>New document</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateDocumentForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
