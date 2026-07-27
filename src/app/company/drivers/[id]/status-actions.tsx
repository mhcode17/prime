"use client";

import { useTransition } from "react";
import type { DriverStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { hireDriver, terminateDriver, reinstateDriver } from "../actions";

export function DriverStatusActions({
  driverId,
  status,
}: {
  driverId: string;
  status: DriverStatus;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {status === "PENDING" && (
        <Button onClick={() => start(() => void hireDriver(driverId))} disabled={pending}>
          Mark as Hired
        </Button>
      )}
      {status === "ACTIVE" && (
        <Button
          variant="danger"
          onClick={() => start(() => void terminateDriver(driverId))}
          disabled={pending}
        >
          Terminate
        </Button>
      )}
      {status === "PENDING" && (
        <Button
          variant="danger"
          onClick={() => start(() => void terminateDriver(driverId))}
          disabled={pending}
        >
          Reject / Terminate
        </Button>
      )}
      {status === "TERMINATED" && (
        <Button
          variant="outline"
          onClick={() => start(() => void reinstateDriver(driverId))}
          disabled={pending}
        >
          Reinstate (to Pending)
        </Button>
      )}
    </div>
  );
}
