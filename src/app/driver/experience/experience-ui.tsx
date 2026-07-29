"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { addExperience, updateExperience, deleteExperience } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export interface ExpEntry {
  id: string;
  employerName: string;
  position: string;
  city: string;
  state: string;
  phone: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd or ""
  isCurrent: boolean;
  reasonForLeaving: string;
}

function Fields({ e }: { e?: ExpEntry }) {
  const [current, setCurrent] = useState(e?.isCurrent ?? false);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Employer / company</Label>
          <Input name="employerName" defaultValue={e?.employerName} required />
        </div>
        <div>
          <Label>Position (optional)</Label>
          <Input name="position" defaultValue={e?.position} placeholder="e.g. CDL-A Driver" />
        </div>
        <div>
          <Label>City (optional)</Label>
          <Input name="city" defaultValue={e?.city} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>State (optional)</Label>
            <Input name="state" defaultValue={e?.state} maxLength={2} />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input name="phone" defaultValue={e?.phone} />
          </div>
        </div>
        <div>
          <Label>From</Label>
          <Input name="startDate" type="date" defaultValue={e?.startDate} required />
        </div>
        <div>
          <Label>To</Label>
          <Input
            name="endDate"
            type="date"
            defaultValue={e?.endDate}
            disabled={current}
          />
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

  // Collapse after a successful save.
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
        {(entry.city || entry.state) && (
          <div className="text-xs text-slate-400">
            {[entry.city, entry.state].filter(Boolean).join(", ")}
            {entry.phone && ` · ${entry.phone}`}
          </div>
        )}
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
