"use client";

import { useState, useTransition } from "react";
import { orderScreening } from "./actions";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";

type Driver = { id: string; name: string };

export function ScreeningOrderPanel({
  drivers,
  defaultDriver,
}: {
  drivers: Driver[];
  defaultDriver?: string;
}) {
  const [driverId, setDriverId] = useState(defaultDriver ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const order = (type: "PSP" | "MVR") => {
    if (!driverId) {
      setMsg("Select a driver first");
      return;
    }
    setMsg(null);
    start(async () => {
      await orderScreening(driverId, type);
      setMsg(`${type} report ordered and completed.`);
    });
  };

  return (
    <div className="space-y-3">
      {msg && (
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>
      )}
      <div>
        <Label>Driver</Label>
        <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">Select a driver…</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => order("PSP")} disabled={pending} className="flex-1">
          {pending ? "Ordering…" : "Order PSP"}
        </Button>
        <Button onClick={() => order("MVR")} disabled={pending} variant="secondary" className="flex-1">
          Order MVR
        </Button>
      </div>
      <p className="text-xs text-slate-400">
        Requests go through Samba Safety (mocked). PSP = Pre-Employment
        Screening; MVR = Motor Vehicle Report.
      </p>
    </div>
  );
}
