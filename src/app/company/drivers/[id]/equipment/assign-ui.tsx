"use client";

import { useActionState, useTransition } from "react";
import { assignEquipment, unassignEquipment } from "./actions";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";

type Equip = { id: string; label: string };

export function AssignEquipmentForm({
  driverId,
  trucks,
  trailers,
}: {
  driverId: string;
  trucks: Equip[];
  trailers: Equip[];
}) {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(assignEquipment, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="driverId" value={driverId} />
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Equipment assigned.</div>
      )}
      <div>
        <Label>Truck</Label>
        <Select name="truckId" defaultValue="">
          <option value="">— None —</option>
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Trailer</Label>
        <Select name="trailerId" defaultValue="">
          <option value="">— None —</option>
          {trailers.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Assigning…" : "Assign equipment"}
      </Button>
    </form>
  );
}

export function UnassignButton({ driverId }: { driverId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => start(() => void unassignEquipment(driverId))}
    >
      {pending ? "Unassigning…" : "Unassign all"}
    </Button>
  );
}
