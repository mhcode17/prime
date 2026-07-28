"use client";

import { useActionState, useTransition } from "react";
import type { AppointmentStatus } from "@prisma/client";
import { createAppointment, setAppointmentStatus } from "@/app/company/appointments/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

export function DriverAppointmentForm({ driverId }: { driverId: string }) {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(createAppointment, undefined);

  return (
    <form action={action} className="space-y-3" key={state?.ok ? "r" : "f"}>
      <input type="hidden" name="driverId" value={driverId} />
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Appointment booked.</div>
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
        <Label>Date &amp; time</Label>
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
        <Input name="location" placeholder="Terminal / HQ address" />
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea name="notes" rows={2} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Booking…" : "Book for this driver"}
      </Button>
    </form>
  );
}

export function AppointmentStatusButtons({
  id,
  status,
}: {
  id: string;
  status: AppointmentStatus;
}) {
  const [pending, start] = useTransition();
  const set = (s: AppointmentStatus) => start(() => void setAppointmentStatus(id, s));
  if (status === "COMPLETED" || status === "CANCELLED") return null;
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => set("COMPLETED")}>
        Completed
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => set("CANCELLED")}>
        Cancel
      </Button>
    </div>
  );
}
