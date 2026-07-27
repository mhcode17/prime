"use client";

import { useActionState } from "react";
import { createAppointment } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

type Driver = { id: string; name: string };

export function CreateAppointmentForm({ drivers }: { drivers: Driver[] }) {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(createAppointment, undefined);

  return (
    <form action={action} className="space-y-3" key={state?.ok ? "r" : "f"}>
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Slot created.</div>
      )}
      <div>
        <Label>Type</Label>
        <Select name="type" defaultValue="ORIENTATION">
          <option value="ORIENTATION">Orientation</option>
          <option value="DRUG_TEST">Drug Test</option>
          <option value="ROAD_TEST">Road Test</option>
          <option value="OTHER">Other</option>
        </Select>
      </div>
      <div>
        <Label>Start date &amp; time</Label>
        <Input name="startsAt" type="datetime-local" required />
      </div>
      <div>
        <Label>Duration</Label>
        <Select name="duration" defaultValue="120">
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="120">2 hours</option>
          <option value="240">4 hours</option>
          <option value="480">Full day</option>
        </Select>
      </div>
      <div>
        <Label>Location</Label>
        <Input name="location" placeholder="e.g. Terminal / HQ address" />
      </div>
      <div>
        <Label>Assign to driver (optional)</Label>
        <Select name="driverId" defaultValue="">
          <option value="">Leave open for self-booking</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-slate-400">
          Choose a driver to set the date yourself, or leave open so a driver can
          pick this window.
        </p>
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea name="notes" rows={2} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create appointment"}
      </Button>
    </form>
  );
}
