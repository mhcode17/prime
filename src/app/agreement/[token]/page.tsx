import { prisma } from "@/lib/db";
import { FileSignature, CheckCircle2, Truck } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { AgreementSignForm } from "./sign-form";

export const dynamic = "force-dynamic";

export default async function AgreementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const a = await prisma.driverAgreement.findFirst({
    where: { token },
    include: { driver: { include: { user: true, company: true } } },
  });

  const companyName = a?.driver.company.name ?? "Trucking CRM";

  const Shell = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
    <main className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-10">
      <div className={`w-full ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-bold text-slate-900">
          <Truck className="h-6 w-6 text-brand-600" />
          {companyName}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Secure e-signature · powered by {companyName}
        </p>
      </div>
    </main>
  );

  if (!a || a.status === "VOIDED") {
    return (
      <Shell>
        <div className="py-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Link not available</h1>
          <p className="mt-1 text-sm text-slate-500">
            This agreement link is invalid, expired, or has been canceled. Please contact {companyName}.
          </p>
        </div>
      </Shell>
    );
  }

  const driverName = `${a.driver.user.firstName} ${a.driver.user.lastName}`;

  if (a.signedAt) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <h1 className="text-lg font-semibold text-slate-900">Already signed</h1>
          <p className="max-w-md text-sm text-slate-500">
            This Independent Contractor Agreement was signed on {formatDateTime(a.signedAt)}
            {a.signerName ? ` by ${a.signerName}` : ""}. No further action is needed.
          </p>
          <a
            href={`/api/agreement/${token}/pdf`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            View signed agreement (PDF)
          </a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell wide>
      <div className="mb-5 flex items-center gap-2">
        <FileSignature className="h-6 w-6 text-brand-600" />
        <h1 className="text-xl font-semibold text-slate-900">Driver Independent Contractor Agreement</h1>
      </div>

      <div className="mb-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <b>{companyName}</b> has sent you this agreement to review and sign. Please read the full document
        below, then enter your name, sign, and confirm at the bottom.
      </div>

      {/* Full agreement preview */}
      <object
        data={`/api/agreement/${token}/pdf`}
        type="application/pdf"
        className="mb-6 h-[70vh] w-full rounded-lg border border-slate-200"
      >
        <a href={`/api/agreement/${token}/pdf`} className="text-brand-600 underline">
          Open the agreement PDF
        </a>
      </object>

      <AgreementSignForm token={token} defaultName={a.contractorName || driverName} />
    </Shell>
  );
}
