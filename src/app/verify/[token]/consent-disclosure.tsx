"use client";

import { useState } from "react";
import { ShieldCheck, ChevronDown, Download } from "lucide-react";

export function ConsentDisclosure({
  token,
  driverName,
  employerName,
  companyName,
  position,
  dates,
  signature,
  signedAt,
}: {
  token: string;
  driverName: string;
  employerName: string;
  companyName: string;
  position: string;
  dates: string;
  signature: string;
  signedAt: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-green-200 bg-green-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-green-800 hover:bg-green-50"
      >
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span className="flex-1">Signed authorization from {driverName}</span>
        <span className="text-xs font-normal text-green-700">
          {open ? "Hide" : "View"}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-green-200 px-4 py-4">
          <dl className="grid grid-cols-[130px_1fr] gap-y-1.5 text-sm text-slate-700">
            <dt className="text-slate-400">Applicant</dt>
            <dd>{driverName}</dd>
            <dt className="text-slate-400">Employer</dt>
            <dd>{employerName}</dd>
            {position && (
              <>
                <dt className="text-slate-400">Position</dt>
                <dd>{position}</dd>
              </>
            )}
            <dt className="text-slate-400">Dates stated</dt>
            <dd>{dates}</dd>
          </dl>

          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            {driverName} authorizes <b>{employerName}</b> to release to{" "}
            <b>{companyName}</b> all information regarding their employment (dates,
            performance, reason for leaving, rehire eligibility, DOT drug &amp;
            alcohol history, and DOT-recordable accidents) for employment
            verification, and releases all parties from liability for providing
            this information.
          </p>

          <div className="mt-3">
            <div className="mb-1 text-xs text-slate-400">Signature</div>
            {signature.startsWith("data:image") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signature}
                alt="applicant signature"
                className="max-h-20 rounded border border-slate-200 bg-white"
              />
            ) : (
              <span className="text-sm text-slate-500">On file</span>
            )}
          </div>
          {signedAt && (
            <div className="mt-2 text-[11px] text-slate-400">Signed {signedAt}</div>
          )}

          <a
            href={`/api/verify/${token}/consent-pdf`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Download authorization (PDF)
          </a>
        </div>
      )}
    </div>
  );
}
