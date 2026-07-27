"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { signDocument, declineDocument } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

export function SignPanel({ assignmentId }: { assignmentId: string }) {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(signDocument, undefined);
  const padRef = useRef<SignaturePadHandle>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");
  const [declining, startDecline] = useTransition();

  const handleSubmit = (formData: FormData) => {
    const data = padRef.current?.toDataURL();
    if (data) formData.set("signatureData", data);
    return action(formData);
  };

  return (
    <div className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <div>
          <Label>Draw your signature</Label>
          <SignaturePad ref={padRef} />
        </div>
        <div>
          <Label>Full legal name</Label>
          <Input name="signedName" placeholder="Type your full name" required />
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" name="consent" value="yes" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" />
          <span>
            I agree that my electronic signature is the legal equivalent of my
            handwritten signature and consent to sign this document
            electronically.
          </span>
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Signing…" : "Sign document"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDecline((v) => !v)}
          >
            Decline
          </Button>
        </div>
      </form>

      {showDecline && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Label>Reason for declining (optional)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason…" />
          <Button
            className="mt-2"
            variant="danger"
            disabled={declining}
            onClick={() => startDecline(async () => {
              await declineDocument(assignmentId, reason);
            })}
          >
            {declining ? "Submitting…" : "Confirm decline"}
          </Button>
        </div>
      )}
    </div>
  );
}
