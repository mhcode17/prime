"use client";

import { useActionState, useRef, useState } from "react";
import { submitAgreement } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SignaturePad, type SignaturePadHandle } from "@/app/driver/documents/[id]/signature-pad";
import { CheckCircle2 } from "lucide-react";

export function AgreementSignForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(submitAgreement, undefined);
  const padRef = useRef<SignaturePadHandle>(null);
  const [err, setErr] = useState<string | null>(null);

  const handle = (formData: FormData) => {
    const sig = padRef.current?.toDataURL();
    if (!sig) {
      setErr("Please sign in the box before submitting.");
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
        <div className="text-lg font-semibold text-slate-900">Agreement signed</div>
        <p className="max-w-md text-sm text-slate-500">
          Thank you. Your signed Independent Contractor Agreement has been recorded. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <form action={handle} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {(state?.error || err) && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state?.error ?? err}</div>
      )}

      <div>
        <Label>Your full name</Label>
        <Input name="signerName" defaultValue={defaultName} required />
      </div>
      <div>
        <Label>Signature</Label>
        <SignaturePad ref={padRef} />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" name="consent" value="yes" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" />
        <span>
          I have read and understood this entire Agreement and agree to be bound by all of its terms and
          conditions. I enter into it freely and voluntarily.
        </span>
      </label>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Sign agreement"}
      </Button>
    </form>
  );
}
