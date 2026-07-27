"use client";

import { useActionState, useTransition } from "react";
import type { EquipmentStatus } from "@prisma/client";
import { createTruck, setTruckStatus, deleteTruck } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function AddTruckForm() {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(createTruck, undefined);

  return (
    <form action={action} className="space-y-3" key={state?.ok ? "r" : "f"}>
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Truck added.</div>
      )}
      <div>
        <Label>Unit number</Label>
        <Input name="unitNumber" placeholder="e.g. T-103" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Make</Label>
          <Input name="make" placeholder="Freightliner" />
        </div>
        <div>
          <Label>Model</Label>
          <Input name="model" placeholder="Cascadia" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Year</Label>
          <Input name="year" type="number" placeholder="2023" />
        </div>
        <div>
          <Label>Plate</Label>
          <Input name="plate" />
        </div>
      </div>
      <div>
        <Label>VIN</Label>
        <Input name="vin" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add truck"}
      </Button>
    </form>
  );
}

export function TruckRowActions({
  id,
  status,
}: {
  id: string;
  status: EquipmentStatus;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <Select
        value={status}
        disabled={pending || status === "ASSIGNED"}
        onChange={(e) => start(() => void setTruckStatus(id, e.target.value as EquipmentStatus))}
        className="h-8 w-36 py-1 text-xs"
      >
        <option value="AVAILABLE">Available</option>
        <option value="ASSIGNED" disabled>Assigned</option>
        <option value="MAINTENANCE">Maintenance</option>
        <option value="OUT_OF_SERVICE">Out of service</option>
      </Select>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending || status === "ASSIGNED"}
        onClick={() => start(() => void deleteTruck(id))}
        title={status === "ASSIGNED" ? "Unassign before deleting" : "Delete"}
      >
        ✕
      </Button>
    </div>
  );
}
