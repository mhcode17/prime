"use client";

import { useState, useTransition } from "react";
import type { AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import {
  setAppointmentStatus,
  assignDriverToSlot,
  deleteAppointment,
} from "./actions";

type Driver = { id: string; name: string };

export function AppointmentActions({
  id,
  status,
  drivers,
}: {
  id: string;
  status: AppointmentStatus;
  drivers: Driver[];
}) {
  const [pending, start] = useTransition();
  const [assignId, setAssignId] = useState("");

  const act = (fn: () => Promise<void>) => start(() => void fn());

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === "OPEN" && (
        <div className="flex items-center gap-1">
          <Select
            value={assignId}
            onChange={(e) => setAssignId(e.target.value)}
            className="h-8 py-1 text-xs"
          >
            <option value="">Assign driver…</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <Button
            size="sm"
            disabled={pending || !assignId}
            onClick={() => act(() => assignDriverToSlot(id, assignId))}
          >
            Assign
          </Button>
        </div>
      )}
      {status === "BOOKED" && (
        <>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => setAppointmentStatus(id, "COMPLETED"))}>
            Completed
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => setAppointmentStatus(id, "NO_SHOW"))}>
            No-show
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => setAppointmentStatus(id, "OPEN"))}>
            Release
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => deleteAppointment(id))} title="Delete">
        ✕
      </Button>
    </div>
  );
}
