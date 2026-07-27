"use client";

import { useState, useTransition } from "react";
import { orderClearinghouse } from "./actions";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import type { ClearinghouseQueryType } from "@prisma/client";

type Driver = { id: string; name: string };

export function ClearinghouseOrderPanel({
  drivers,
  defaultDriver,
}: {
  drivers: Driver[];
  defaultDriver?: string;
}) {
  const [driverId, setDriverId] = useState(defaultDriver ?? "");
  const [type, setType] = useState<ClearinghouseQueryType>("PRE_EMPLOYMENT_FULL");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const order = () => {
    if (!driverId) return setMsg("Select a driver first");
    setMsg(null);
    start(async () => {
      await orderClearinghouse(driverId, type);
      setMsg("Clearinghouse query submitted and returned.");
    });
  };

  return (
    <div className="space-y-3">
      {msg && <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}
      <div>
        <Label>Driver</Label>
        <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">Select a driver…</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Query type</Label>
        <Select value={type} onChange={(e) => setType(e.target.value as ClearinghouseQueryType)}>
          <option value="PRE_EMPLOYMENT_FULL">Pre-Employment (Full)</option>
          <option value="LIMITED">Limited</option>
          <option value="ANNUAL">Annual</option>
        </Select>
      </div>
      <Button onClick={order} disabled={pending} className="w-full">
        {pending ? "Querying…" : "Submit Clearinghouse query"}
      </Button>
      <p className="text-xs text-slate-400">
        FMCSA Drug &amp; Alcohol Clearinghouse (mocked). A full query requires
        driver consent in production.
      </p>
    </div>
  );
}
