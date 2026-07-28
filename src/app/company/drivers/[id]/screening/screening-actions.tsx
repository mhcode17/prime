"use client";

import { useState, useTransition } from "react";
import { orderScreening } from "@/app/company/screening/actions";
import { Button } from "@/components/ui/button";

export function DriverScreeningActions({ driverId }: { driverId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const order = (type: "PSP" | "MVR") => {
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
      <div className="flex gap-2">
        <Button onClick={() => order("PSP")} disabled={pending} className="flex-1">
          {pending ? "Ordering…" : "Order PSP"}
        </Button>
        <Button onClick={() => order("MVR")} disabled={pending} variant="secondary" className="flex-1">
          Order MVR
        </Button>
      </div>
      <p className="text-xs text-slate-400">
        Runs through Samba Safety for this driver. PSP = Pre-Employment
        Screening; MVR = Motor Vehicle Report.
      </p>
    </div>
  );
}
