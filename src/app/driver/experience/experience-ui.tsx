"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addExperience,
  updateExperience,
  deleteExperience,
  searchCarriers,
} from "./actions";
import type { CarrierSummary } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { Loader2, ShieldCheck } from "lucide-react";
import { signConsent } from "./actions";
import { SignaturePad, type SignaturePadHandle } from "@/app/driver/documents/[id]/signature-pad";

export interface ExpEntry {
  id: string;
  employerName: string;
  position: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd or ""
  isCurrent: boolean;
  reasonForLeaving: string;
  verificationStatus: string;
  consentSigned: boolean;
}

// Autocomplete input for the employer name, backed by the FMCSA name search.
function CarrierAutocomplete({
  value,
  onChange,
  onPick,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (c: CarrierSummary) => void;
}) {
  const [results, setResults] = useState<CarrierSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await searchCarriers(q);
      setLoading(false);
      if (res.ok) {
        setResults(res.results);
        setOpen(res.results.length > 0);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative">
      <Input
        name="employerName"
        value={value}
        autoComplete="off"
        required
        onChange={(e) => {
          dirty.current = true;
          onChange(e.target.value);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && (
        <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((c, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  dirty.current = false;
                  onPick(c);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
              >
                <div className="text-sm font-medium text-slate-800">{c.legalName}</div>
                <div className="text-xs text-slate-400">
                  {[c.city, c.state].filter(Boolean).join(", ")}
                  {c.dotNumber ? ` · USDOT ${c.dotNumber}` : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Fields({ e }: { e?: ExpEntry }) {
  const [employerName, setEmployerName] = useState(e?.employerName ?? "");
  const [position, setPosition] = useState(e?.position ?? "");
  const [city, setCity] = useState(e?.city ?? "");
  const [stateVal, setStateVal] = useState(e?.state ?? "");
  const [phone, setPhone] = useState(e?.phone ?? "");
  const [email, setEmail] = useState(e?.email ?? "");
  const [current, setCurrent] = useState(e?.isCurrent ?? false);

  return (
    <div className="space-y-3">
      <div>
        <Label>Employer / company</Label>
        <CarrierAutocomplete
          value={employerName}
          onChange={setEmployerName}
          onPick={(c) => {
            setEmployerName(c.legalName);
            if (c.city) setCity(c.city);
            if (c.state) setStateVal(c.state);
            if (c.phone) setPhone(c.phone);
          }}
        />
        <p className="mt-1 text-xs text-slate-400">
          Start typing — suggestions from the FMCSA carrier database appear below.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Position (optional)</Label>
          <Input name="position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. CDL-A Driver" />
        </div>
        <div>
          <Label>Company email (optional)</Label>
          <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hr@carrier.com" />
        </div>
        <div>
          <Label>City (optional)</Label>
          <Input name="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>State (optional)</Label>
            <Input name="state" value={stateVal} onChange={(e) => setStateVal(e.target.value)} maxLength={2} />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>From</Label>
          <Input name="startDate" type="date" defaultValue={e?.startDate} required />
        </div>
        <div>
          <Label>To</Label>
          <Input name="endDate" type="date" defaultValue={e?.endDate} disabled={current} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          name="isCurrent"
          checked={current}
          onChange={(ev) => setCurrent(ev.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600"
        />
        I currently work here
      </label>
      <div>
        <Label>Reason for leaving (optional)</Label>
        <Textarea name="reasonForLeaving" rows={2} defaultValue={e?.reasonForLeaving} />
      </div>
    </div>
  );
}

export function AddExperienceForm() {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(addExperience, undefined);

  return (
    <form action={action} className="space-y-4" key={state?.ok ? "reset" : "form"}>
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Experience added.</div>
      )}
      <Fields />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add experience"}
      </Button>
    </form>
  );
}

export function ExperienceItem({
  entry,
  driverName,
  companyName,
}: {
  entry: ExpEntry;
  driverName: string;
  companyName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [consentOpen, setConsentOpen] = useState(false);
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(updateExperience, undefined);

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state?.ok]);

  const period = `${fmt(entry.startDate)} — ${entry.isCurrent ? "Present" : fmt(entry.endDate)}`;

  if (editing) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={entry.id} />
          {state?.error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
          )}
          <Fields e={entry} />
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">{entry.employerName}</span>
            {entry.verificationStatus && entry.verificationStatus !== "NOT_REQUESTED" && (
              <Badge tone={statusTone(entry.verificationStatus)}>
                {humanize(entry.verificationStatus)}
              </Badge>
            )}
          </div>
          <div className="text-sm text-slate-500">
            {entry.position && `${entry.position} · `}
            {period}
          </div>
          <div className="text-xs text-slate-400">
            {[entry.city, entry.state].filter(Boolean).join(", ")}
            {entry.phone && ` · ${entry.phone}`}
            {entry.email && ` · ${entry.email}`}
          </div>
          {entry.reasonForLeaving && (
            <div className="mt-1 text-xs text-slate-500">Reason for leaving: {entry.reasonForLeaving}</div>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            disabled={deleting}
            onClick={() => startDelete(() => void deleteExperience(entry.id))}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Consent bar */}
      {entry.consentSigned ? (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
          <ShieldCheck className="h-4 w-4" /> Consent signed
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2">
          <span className="text-xs text-amber-800">
            ⚠ Consent required — sign to authorize this employer to release your records.
          </span>
          <Button size="sm" onClick={() => setConsentOpen(true)}>
            Sign consent form
          </Button>
        </div>
      )}

      {consentOpen && (
        <ConsentModal
          experienceId={entry.id}
          employerName={entry.employerName}
          driverName={driverName}
          companyName={companyName}
          onClose={() => setConsentOpen(false)}
        />
      )}
    </div>
  );
}

function ConsentModal({
  experienceId,
  employerName,
  driverName,
  companyName,
  onClose,
}: {
  experienceId: string;
  employerName: string;
  driverName: string;
  companyName: string;
  onClose: () => void;
}) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    const sig = padRef.current?.toDataURL();
    if (!sig) {
      setErr("Please sign before submitting.");
      return;
    }
    setErr(null);
    start(async () => {
      const res = await signConsent(experienceId, sig);
      if (res.error) setErr(res.error);
      else onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Consent to release records</h3>
        {err && <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{err}</div>}
        <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          I, <b>{driverName}</b>, authorize <b>{employerName}</b> to release to{" "}
          <b>{companyName}</b> all information regarding my employment, including
          job performance, dates of employment, reason for leaving, eligibility
          for rehire, DOT drug &amp; alcohol testing history, and any
          DOT-recordable accidents, for the purpose of employment verification. I
          release all parties from any liability for providing this information.
        </div>
        <Label>Signature</Label>
        <SignaturePad ref={padRef} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Signing…" : "Sign consent"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function fmt(d: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}
