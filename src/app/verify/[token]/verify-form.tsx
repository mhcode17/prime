"use client";

import { useActionState, useRef, useState } from "react";
import { submitVerification } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { SignaturePad, type SignaturePadHandle } from "@/app/driver/documents/[id]/signature-pad";
import { CheckCircle2 } from "lucide-react";

export function VerifyForm({
  token,
  employerName,
}: {
  token: string;
  employerName: string;
}) {
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
          Your employment verification for {employerName} has been submitted and
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Were the employment dates accurate?</Label>
          <Select name="datesConfirmed" defaultValue="">
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
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
        <div>
          <Label>Any drug &amp; alcohol program violation or refusal? (DOT)</Label>
          <Select name="drugAlcoholViolation" defaultValue="">
            <option value="">Unknown / N/A</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </div>
        <div>
          <Label>Any DOT-recordable accident during employment?</Label>
          <Select name="dotRecordableAccident" defaultValue="">
            <option value="">Unknown / N/A</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </div>
      </div>

      <div>
        <Label>Additional comments (optional)</Label>
        <Textarea name="comments" rows={3} placeholder="Reason for leaving, corrections, safety performance, etc." />
      </div>

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
          of {employerName}.
        </span>
      </label>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Submit verification"}
      </Button>
    </form>
  );
}
