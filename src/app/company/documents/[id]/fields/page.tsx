import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { FieldEditor } from "./field-editor";
import type { FieldType } from "@/lib/fields";

export default async function DocumentFieldsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await getCurrentCompany("documents");

  const doc = await prisma.document.findFirst({
    where: { id, companyId },
    include: { fields: true, assignments: { select: { status: true } } },
  });
  if (!doc) notFound();

  const isPdf =
    doc.fileType === "application/pdf" ||
    (doc.content?.startsWith("data:application/pdf") ?? false);

  if (!isPdf || !doc.content) {
    return (
      <div>
        <Link href={`/company/documents/${doc.id}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
          ← Back to document
        </Link>
        <PageHeader title={doc.title} description="Field placement" />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Field placement is only available for PDF documents. Re-create this
          document by uploading a PDF file.
        </div>
      </div>
    );
  }

  const hasSigned = doc.assignments.some((a) => a.status === "SIGNED");

  return (
    <div>
      <Link href={`/company/documents/${doc.id}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to document
      </Link>
      <PageHeader
        title={`Prepare: ${doc.title}`}
        description="Drag fields onto the document. Auto-fill fields pull from each driver's profile at signing."
      />
      {hasSigned ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          This document has already been signed by a driver, so its field layout
          is locked.
        </div>
      ) : (
        <FieldEditor
          documentId={doc.id}
          dataUrl={doc.content}
          initial={doc.fields.map((f) => ({
            tid: f.id,
            type: f.type as FieldType,
            page: f.page,
            x: f.x,
            y: f.y,
            w: f.w,
            h: f.h,
            label: f.label ?? "",
          }))}
        />
      )}
    </div>
  );
}
