import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { ShieldCheck, Download } from "lucide-react";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center">
      <div className="w-52 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string; aid: string }>;
}) {
  const { id, aid } = await params;
  const { companyId, company } = await getCurrentCompany("documents");

  const a = await prisma.documentAssignment.findFirst({
    where: { id: aid, documentId: id, document: { companyId } },
    include: { document: true, driver: { include: { user: true } } },
  });
  if (!a) notFound();

  if (a.status !== "SIGNED") {
    return (
      <div>
        <Link href={`/company/documents/${id}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
          ← Back to document
        </Link>
        <PageHeader title="Certificate" />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          This document has not been signed yet, so no certificate is available.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/company/documents/${id}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to document
      </Link>
      <PageHeader
        title="Certificate of Completion"
        actions={
          <a
            href={`/api/assignments/${a.id}/pdf`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Download className="h-4 w-4" /> Download signed PDF
          </a>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" /> Verified electronic signature
            </span>
          </CardTitle>
          <Badge tone="green">Completed</Badge>
        </CardHeader>
        <CardContent>
          <Row label="Envelope ID" value={<span className="font-mono text-xs">{a.id}</span>} />
          <Row label="Document" value={a.document.title} />
          <Row label="Company" value={company.name} />
          <Row
            label="Signer"
            value={
              <>
                {a.driver.user.firstName} {a.driver.user.lastName}{" "}
                <span className="text-slate-400">&lt;{a.driver.user.email}&gt;</span>
              </>
            }
          />
          <Row label="Sent" value={formatDateTime(a.createdAt)} />
          <Row label="First viewed" value={formatDateTime(a.viewedAt)} />
          <Row label="Signed" value={formatDateTime(a.signedAt)} />
          <Row label="Signer IP address" value={a.signerIp ?? "unknown"} />
          <Row
            label="Document hash (SHA-256)"
            value={<span className="break-all font-mono text-xs text-slate-600">{a.contentHash}</span>}
          />
          {a.signatureData?.startsWith("data:image") && (
            <Row
              label="Signature"
              value={
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.signatureData} alt="signature" className="max-h-20 rounded border border-slate-200 bg-white" />
              }
            />
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-slate-400">
        The downloaded PDF includes this certificate as its final page. Any change
        to the signed document invalidates the hash above.
      </p>
    </div>
  );
}
