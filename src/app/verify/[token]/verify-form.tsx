"use client";

import { useActionState, useRef, useState } from "react";
import { submitVerification } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { SignaturePad, type SignaturePadHandle } from "@/app/driver/documents/[id]/signature-pad";
import { CheckCircle2 } from "lucide-react";
import { VEHICLE_TYPES, REASONS, CHARACTERISTICS, RATING_OPTIONS, DA_QUESTIONS } from "@/lib/sph";

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 border-b border-slate-200 pb-2">
      <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-xs font-bold text-white">
        {num}
      </span>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    </div>
  );
}

function YesNo({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-slate-700">{label}</span>
      <Select name={name} defaultValue="" className="h-9 w-28 shrink-0 py-1.5 text-sm">
        <option value="">—</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </Select>
    </div>
  );
}

export function VerifyForm({ token }: { token: string; employerName: string }) {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(submitVerification, undefined);
  const padRef = useRef<SignaturePadHandle>(null);
  const [err, setErr] = useState<string | null>(null);

  const handle = (formData: FormData) => {
    const sig = padRef.current?.toDataURL();
    if (!sig) {
      setErr("Please sign at the bottom before submitting.");
      return;
    }
    setErr(null);
    formData.set("signature", sig);
    return action(formData);
  };

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-500" />
        <div className="text-lg font-semibold text-slate-900">Thank you</div>
        <p className="max-w-md text-sm text-slate-500">
          Your safety performance history response has been submitted and
          recorded. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <form action={handle} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {(state?.error || err) && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state?.error ?? err}
        </div>
      )}

      {/* ── Part 2: Accident / Employment history ── */}
      <SectionHeader num={2} title="Accident History (to be completed by previous employer)" />

      <YesNo name="employedByUs" label="The applicant named above was employed by us" />

      <div>
        <Label>Employed — dates</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="mb-1 block text-xs text-slate-400">From</span>
            <DatePicker name="confirmedStartDate" />
          </div>
          <div>
            <span className="mb-1 block text-xs text-slate-400">To (blank if current)</span>
            <DatePicker name="confirmedEndDate" />
          </div>
        </div>
      </div>

      <YesNo name="didDriveVehicle" label="Did he/she drive a motor vehicle for you?" />

      <div>
        <Label>If yes, what type?</Label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {VEHICLE_TYPES.map((v) => (
            <label key={v.key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
              <input type="checkbox" name={`vehicle_${v.key}`} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
              {v.label}
            </label>
          ))}
        </div>
        <Input name="vehicleTypeOther" placeholder="Other (specify)" className="mt-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Reason for leaving your employ</Label>
          <Select name="reasonForLeavingType" defaultValue="">
            <option value="">—</option>
            {REASONS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Eligible for rehire?</Label>
          <Select name="eligibleForRehire" defaultValue="">
            <option value="">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="noSafetyHistory" className="h-4 w-4 rounded border-slate-300 text-brand-600" />
        No safety performance history to report
      </label>

      <div>
        <Label>Accidents (in the 3 years prior to the application)</Label>
        <p className="mb-2 text-xs text-slate-400">Leave blank if there is no accident register data.</p>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Input name={`accident_${i}_date`} placeholder="Date" />
              <Input name={`accident_${i}_location`} placeholder="Location" />
              <Input name={`accident_${i}_injuries`} placeholder="# Injuries" />
              <Input name={`accident_${i}_fatalities`} placeholder="# Fatalities" />
              <Input name={`accident_${i}_hazmat`} placeholder="Hazmat spill" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Any other accidents reported to government agencies or insurers</Label>
        <Textarea name="otherAccidents" rows={2} />
      </div>
      <div>
        <Label>Any other remarks</Label>
        <Textarea name="accidentRemarks" rows={2} />
      </div>

      {/* ── Part 3: Drug & Alcohol ── */}
      <SectionHeader num={3} title="Drug & Alcohol Information (FMCSR 391.23 & 40.25)" />
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="noDrugAlcoholInfo" className="h-4 w-4 rounded border-slate-300 text-brand-600" />
        No drug & alcohol information is available on the above named applicant
      </label>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-3">
        {DA_QUESTIONS.map((q, i) => (
          <YesNo key={q.key} name={`da_${q.key}`} label={`${i + 1}. ${q.label}`} />
        ))}
      </div>

      {/* ── Part 4: Characteristics ── */}
      <SectionHeader num={4} title="Driver Characteristics" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-1 pr-2 font-medium">Characteristic</th>
              {RATING_OPTIONS.map((o) => (
                <th key={o} className="px-2 py-1 text-center font-medium">{o}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHARACTERISTICS.map((c) => (
              <tr key={c.key} className="border-t border-slate-100">
                <td className="py-2 pr-2 text-slate-700">{c.label}</td>
                {RATING_OPTIONS.map((o) => (
                  <td key={o} className="px-2 py-2 text-center">
                    <input type="radio" name={`rating_${c.key}`} value={o} className="h-4 w-4 border-slate-300 text-brand-600" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Signature ── */}
      <SectionHeader num={5} title="Signature" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Your name</Label>
          <Input name="responderName" required />
        </div>
        <div>
          <Label>Your title (optional)</Label>
          <Input name="responderTitle" placeholder="e.g. Safety Manager, HR" />
        </div>
      </div>
      <div>
        <Label>Signature</Label>
        <SignaturePad ref={padRef} />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" name="consent" value="yes" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" />
        <span>
          I certify that the information provided above is true and accurate to
          the best of my knowledge, and that I am authorized to respond on behalf
          of the previous employer.
        </span>
      </label>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Submit safety performance history"}
      </Button>
    </form>
  );
}
