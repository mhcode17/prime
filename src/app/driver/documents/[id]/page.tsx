import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { DocumentViewer } from "@/components/document-viewer";
import { formatDateTime } from "@/lib/utils";
import { resolveAutoField, isAutoField, type FieldType, type SignerData } from "@/lib/fields";
import { SignPanel } from "./sign-panel";
import { FieldSigner, type SignerField } from "./field-signer";
import { CheckCircle2, Download } from "lucide-react";

export default async function DriverSignDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { driver } = await getCurrentDriver();

  const assignment = await prisma.documentAssignment.findFirst({
    where: { id, driverId: driver.id },
    include: { document: { include: { fields: true } }, driver: { include: { user: true } } },
  });
  if (!assignment) notFound();

  if (assignment.status === "SENT") {
    await prisma.documentAssignment.update({
      where: { id: assignment.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
    assignment.status = "VIEWED";
  }

  const canSign = ["SENT", "VIEWED"].includes(assignment.status);
  const doc = assignment.document;
  const isPdf =
    doc.fileType === "application/pdf" ||
    (doc.content?.startsWith("data:application/pdf") ?? false);
  const hasFields = doc.fields.length > 0;
  const usesFieldSigning = isPdf && hasFields && !!doc.content;

  // Resolve auto-fill values to show the driver in the field signer.
  const signer: SignerData = {
    firstName: assignment.driver.user.firstName,
    lastName: assignment.driver.user.lastName,
    email: assignment.driver.user.email,
    phone: assignment.driver.user.phone,
    dateOfBirth: driver.dateOfBirth,
    licenseNumber: driver.licenseNumber,
    licenseState: driver.licenseState,
    address: driver.address,
    city: driver.city,
    state: driver.state,
    zip: driver.zip,
  };
  const now = new Date();
  const autoValues: Record<string, string> = {};
  for (const f of doc.fields) {
    if (isAutoField(f.type as FieldType)) {
      autoValues[f.id] = resolveAutoField(f.type as FieldType, signer, now);
    }
  }
  const signerFields: SignerField[] = doc.fields.map((f) => ({
    id: f.id,
    type: f.type as FieldType,
    page: f.page,
    x: f.x,
    y: f.y,
    w: f.w,
    h: f.h,
    label: f.label,
    required: f.required,
  }));

  return (
    <div>
      <Link href="/driver/documents" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to documents
      </Link>
      <PageHeader
        title={doc.title}
        description={doc.description ?? undefined}
        actions={<Badge tone={statusTone(assignment.status)}>{humanize(assignment.status)}</Badge>}
      />

      {assignment.status === "SIGNED" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <div className="text-lg font-semibold text-slate-900">
              Signed on {formatDateTime(assignment.signedAt)}
            </div>
            <p className="text-sm text-slate-500">
              A completed copy with a certificate of authenticity is available.
            </p>
            {assignment.signedPdf && (
              <a
                href={`/api/assignments/${assignment.id}/pdf`}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Download className="h-4 w-4" /> Download signed PDF
              </a>
            )}
          </CardContent>
        </Card>
      ) : !canSign ? (
        <Card>
          <CardContent className="py-8 text-sm text-slate-600">
            This document was <Badge tone={statusTone(assignment.status)}>{humanize(assignment.status)}</Badge>.
            {assignment.declinedReason && (
              <p className="mt-2 text-slate-500">Reason: {assignment.declinedReason}</p>
            )}
          </CardContent>
        </Card>
      ) : usesFieldSigning ? (
        <FieldSigner
          assignmentId={assignment.id}
          dataUrl={doc.content!}
          fields={signerFields}
          autoValues={autoValues}
        />
      ) : (
        // Fallback: text documents (or PDFs with no fields) use simple signing.
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Document</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentViewer content={doc.content} fileType={doc.fileType} fileName={doc.fileName} />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Sign</CardTitle>
              </CardHeader>
              <CardContent>
                {isPdf && !hasFields && (
                  <p className="mb-3 text-xs text-slate-400">
                    Your company hasn&apos;t placed signature fields on this PDF;
                    sign below to accept it.
                  </p>
                )}
                <SignPanel assignmentId={assignment.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
