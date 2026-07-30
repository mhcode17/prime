import { prisma } from "@/lib/db";
import { Truck, ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { VerifyForm } from "./verify-form";
import { ConsentDisclosure } from "./consent-disclosure";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const exp = await prisma.driverExperience.findFirst({
    where: { verificationToken: token },
    include: { driver: { include: { user: true, company: true } } },
  });

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-bold text-slate-900">
          <Truck className="h-6 w-6 text-brand-600" />
          {exp?.driver.company.name ?? "Trucking CRM"}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Secure employment verification · powered by {exp?.driver.company.name ?? "Trucking CRM"}
        </p>
      </div>
    </main>
  );

  if (!exp) {
    return (
      <Shell>
        <div className="py-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Link not found</h1>
          <p className="mt-1 text-sm text-slate-500">
            This verification link is invalid or has expired. Please contact the
            requesting company.
          </p>
        </div>
      </Shell>
    );
  }

  const driverName = `${exp.driver.user.firstName} ${exp.driver.user.lastName}`;
  const period = `${formatDate(exp.startDate)} — ${exp.isCurrent ? "Present" : formatDate(exp.endDate)}`;

  if (exp.respondedAt) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <h1 className="text-lg font-semibold text-slate-900">Already submitted</h1>
          <p className="max-w-md text-sm text-slate-500">
            This employment verification for <b>{exp.employerName}</b> was
            submitted on {formatDateTime(exp.respondedAt)}
            {exp.responderName ? ` by ${exp.responderName}` : ""}. No further
            action is needed.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-5 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-brand-600" />
        <h1 className="text-xl font-semibold text-slate-900">Employment Verification</h1>
      </div>

      <div className="mb-6 rounded-xl bg-slate-50 p-4 text-sm">
        <p className="text-slate-600">
          <b>{exp.driver.company.name}</b> is verifying the prior employment of{" "}
          <b>{driverName}</b>. According to the applicant:
        </p>
        <dl className="mt-3 grid grid-cols-[130px_1fr] gap-y-1 text-slate-700">
          <dt className="text-slate-400">Employer</dt>
          <dd>{exp.employerName}</dd>
          {exp.position && (
            <>
              <dt className="text-slate-400">Position</dt>
              <dd>{exp.position}</dd>
            </>
          )}
          <dt className="text-slate-400">Dates</dt>
          <dd>{period}</dd>
        </dl>
        <p className="mt-3 text-xs text-slate-400">
          Please confirm the details below and sign. Your response is recorded
          directly with {exp.driver.company.name}.
        </p>
      </div>

      {/* Driver's signed consent — collapsible; the employer opens it to see
          what the applicant stated (company, dates), the signature and date. */}
      {exp.consentSignature ? (
        <ConsentDisclosure
          token={token}
          driverName={driverName}
          employerName={exp.employerName}
          companyName={exp.driver.company.name}
          position={exp.position ?? ""}
          dates={period}
          signature={exp.consentSignature}
          signedAt={exp.consentSignedAt ? formatDateTime(exp.consentSignedAt) : ""}
        />
      ) : (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          Note: the applicant&apos;s signed authorization is not yet on file. You
          may still respond, but confirm you have the applicant&apos;s consent.
        </div>
      )}

      <VerifyForm token={token} employerName={exp.employerName} />
    </Shell>
  );
}
