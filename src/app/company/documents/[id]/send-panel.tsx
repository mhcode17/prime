"use client";

import { useState, useTransition } from "react";
import { sendDocument } from "../actions";
import { Button } from "@/components/ui/button";

type Driver = { id: string; name: string; status: string; assigned: boolean };

export function SendPanel({
  documentId,
  drivers,
}: {
  documentId: string;
  drivers: Driver[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = () => {
    if (selected.size === 0) return;
    start(async () => {
      await sendDocument(documentId, Array.from(selected));
      setSelected(new Set());
      setDone(true);
    });
  };

  const available = drivers.filter((d) => !d.assigned && d.status !== "TERMINATED");

  if (available.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        All eligible drivers have already been sent this document.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {done && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Sent. The document now appears in the drivers&apos; portals.
        </div>
      )}
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {available.map((d) => (
          <label
            key={d.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={selected.has(d.id)}
              onChange={() => toggle(d.id)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            <span className="text-sm text-slate-800">{d.name}</span>
            <span className="ml-auto text-xs text-slate-400">{d.status}</span>
          </label>
        ))}
      </div>
      <Button onClick={send} disabled={pending || selected.size === 0}>
        {pending ? "Sending…" : `Send to ${selected.size || ""} driver${selected.size === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}
