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
import { Loader2 } from "lucide-react";

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

export function ExperienceItem({ entry }: { entry: ExpEntry }) {
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();
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
    <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <div className="font-medium text-slate-900">{entry.employerName}</div>
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
  );
}

function fmt(d: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}
