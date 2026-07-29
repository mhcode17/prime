"use client";

import { useActionState, useState, useTransition } from "react";
import { recordVerification, sendVerificationEmail } from "./verification-actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { Mail } from "lucide-react";

export interface VerifEntry {
  id: string;
  employerName: string;
  position: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  period: string;
  reasonForLeaving: string;
  status: string;
  method: string;
  notes: string;
  datesConfirmed: boolean | null;
  eligibleForRehire: boolean | null;
  verifiedByName: string;
  verifiedAt: string;
}

function triLabel(v: boolean | null) {
  return v === true ? "Yes" : v === false ? "No" : "Unknown";
}
function triValue(v: boolean | null) {
  return v === true ? "yes" : v === false ? "no" : "";
}

export function ExperienceVerification({
  entry,
  driverName,
  companyName,
}: {
  entry: VerifEntry;
  driverName: string;
  companyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(recordVerification, undefined);

  const [sending, startSend] = useTransition();
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sendSystemEmail = () =>
    startSend(async () => {
      setSendMsg(null);
      const res = await sendVerificationEmail(entry.id);
      setSendMsg(
        res.ok
          ? { ok: true, text: `Request sent to ${entry.email}` }
          : { ok: false, text: res.error ?? "Failed to send" },
      );
    });

  const mailtoHref = () => {
    const subject = `Employment Verification — ${driverName}`;
    const body = `Hello,

${companyName} is verifying the prior employment of ${driverName}, who reports working at ${entry.employerName} (${entry.period}).

Could you please confirm:
1. Employment dates${entry.position ? ` and position (${entry.position})` : ""}
2. Eligibility for rehire
3. Reason for leaving
4. (DOT) Any drug & alcohol testing program violations, refusals, or DOT-recordable accidents during employment

Thank you,
${companyName}`;
    return `mailto:${encodeURIComponent(entry.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium text-slate-900">{entry.employerName}</div>
          <div className="text-sm text-slate-500">
            {entry.position && `${entry.position} · `}
            {entry.period}
            {(entry.city || entry.state) && ` · ${[entry.city, entry.state].filter(Boolean).join(", ")}`}
          </div>
          {(entry.phone || entry.email) && (
            <div className="text-xs text-slate-400">
              {[entry.phone, entry.email].filter(Boolean).join(" · ")}
            </div>
          )}
          {entry.reasonForLeaving && (
            <div className="mt-1 text-xs text-slate-500">Reason for leaving: {entry.reasonForLeaving}</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(entry.status)}>{humanize(entry.status)}</Badge>
          {entry.email && (
            <>
              <Button size="sm" onClick={sendSystemEmail} disabled={sending}>
                <Mail className="h-4 w-4" /> {sending ? "Sending…" : "Send request"}
              </Button>
              <a href={mailtoHref()} title="Open in your mail app instead">
                <Button size="sm" variant="ghost">Mail app</Button>
              </a>
            </>
          )}
          <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Verify"}
          </Button>
        </div>
      </div>

      {sendMsg && (
        <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${sendMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {sendMsg.text}
        </div>
      )}

      {/* Existing verification summary */}
      {entry.status !== "NOT_REQUESTED" && !open && (
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Dates confirmed: <b>{triLabel(entry.datesConfirmed)}</b> · Eligible for rehire:{" "}
          <b>{triLabel(entry.eligibleForRehire)}</b>
          {entry.method && ` · via ${entry.method}`}
          {entry.verifiedByName && ` · by ${entry.verifiedByName}`}
          {entry.verifiedAt && ` · ${entry.verifiedAt}`}
          {entry.notes && <div className="mt-1 text-slate-500">{entry.notes}</div>}
        </div>
      )}

      {open && (
        <form action={action} className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3">
          <input type="hidden" name="experienceId" value={entry.id} />
          {state?.error && (
            <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</div>
          )}
          {state?.ok && (
            <div className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">Verification saved.</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select name="status" defaultValue={entry.status}>
                <option value="NOT_REQUESTED">Not requested</option>
                <option value="REQUESTED">Requested (awaiting)</option>
                <option value="VERIFIED">Verified</option>
                <option value="UNABLE_TO_VERIFY">Unable to verify</option>
                <option value="NO_RESPONSE">No response</option>
              </Select>
            </div>
            <div>
              <Label>Method</Label>
              <Select name="method" defaultValue={entry.method}>
                <option value="">—</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="fax">Fax</option>
              </Select>
            </div>
            <div>
              <Label>Dates confirmed?</Label>
              <Select name="datesConfirmed" defaultValue={triValue(entry.datesConfirmed)}>
                <option value="">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </div>
            <div>
              <Label>Eligible for rehire?</Label>
              <Select name="eligibleForRehire" defaultValue={triValue(entry.eligibleForRehire)}>
                <option value="">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes (what the prior employer said)</Label>
            <Textarea name="notes" rows={2} defaultValue={entry.notes} />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save verification"}
          </Button>
        </form>
      )}
    </div>
  );
}
