"use client";

import { useState, useTransition } from "react";
import { orderClearinghouse } from "@/app/company/clearinghouse/actions";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import type { ClearinghouseQueryType } from "@prisma/client";

export function DriverClearinghousePanel({ driverId }: { driverId: string }) {
  const [type, setType] = useState<ClearinghouseQueryType>("PRE_EMPLOYMENT_FULL");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {msg && <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}
      <div>
        <Label>Query type</Label>
        <Select value={type} onChange={(e) => setType(e.target.value as ClearinghouseQueryType)}>
          <option value="PRE_EMPLOYMENT_FULL">Pre-Employment (Full)</option>
          <option value="LIMITED">Limited</option>
          <option value="ANNUAL">Annual</option>
        </Select>
      </div>
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            await orderClearinghouse(driverId, type);
            setMsg("Clearinghouse query submitted and returned.");
          })
        }
      >
        {pending ? "Querying…" : "Submit Clearinghouse query"}
      </Button>
      <p className="text-xs text-slate-400">
        FMCSA Drug &amp; Alcohol Clearinghouse (mocked) for this driver.
      </p>
    </div>
  );
}
