"use client";

import { useActionState } from "react";
import { orderDrugTest } from "@/app/company/drug-tests/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const TYPES = [
  "PRE_EMPLOYMENT",
  "RANDOM",
  "POST_ACCIDENT",
  "REASONABLE_SUSPICION",
  "RETURN_TO_DUTY",
  "FOLLOW_UP",
];

export function DriverDrugTestForm({ driverId }: { driverId: string }) {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(orderDrugTest, undefined);

  return (
    <form action={action} className="space-y-3" key={state?.ok ? "r" : "f"}>
      <input type="hidden" name="driverId" value={driverId} />
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Drug test ordered.</div>
      )}
      <div>
        <Label>Test type</Label>
        <Select name="type" defaultValue="PRE_EMPLOYMENT">
          {TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Lab / collection site (optional)</Label>
        <Input name="labName" placeholder="e.g. Quest Diagnostics" />
      </div>
      <div>
        <Label>Schedule for (optional)</Label>
        <Input name="scheduledAt" type="datetime-local" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Ordering…" : "Order drug test"}
      </Button>
    </form>
  );
}
