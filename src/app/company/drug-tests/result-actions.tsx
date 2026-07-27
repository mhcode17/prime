"use client";

import { useTransition } from "react";
import type { DrugTestStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { setDrugTestResult } from "./actions";

export function DrugTestResultActions({
  id,
  status,
}: {
  id: string;
  status: DrugTestStatus;
}) {
  const [pending, start] = useTransition();
  const done = status.startsWith("COMPLETED") || status === "CANCELLED";

  if (done) return null;

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => start(() => void setDrugTestResult(id, "COMPLETED_NEGATIVE"))}
      >
        Negative
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() => start(() => void setDrugTestResult(id, "COMPLETED_POSITIVE"))}
      >
        Positive
      </Button>
    </div>
  );
}
