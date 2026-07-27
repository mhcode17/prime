"use client";

import { useTransition } from "react";
import type { CompanyStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { setCompanyStatus } from "./actions";

export function CompanyStatusActions({
  companyId,
  status,
}: {
  companyId: string;
  status: CompanyStatus;
}) {
  const [pending, start] = useTransition();

  const update = (next: CompanyStatus) =>
    start(() => {
      void setCompanyStatus(companyId, next);
    });

  return (
    <div className="flex gap-2">
      {status !== "ACTIVE" && (
        <Button size="sm" onClick={() => update("ACTIVE")} disabled={pending}>
          Approve
        </Button>
      )}
      {status !== "SUSPENDED" && (
        <Button size="sm" variant="danger" onClick={() => update("SUSPENDED")} disabled={pending}>
          Suspend
        </Button>
      )}
      {status === "SUSPENDED" && (
        <Button size="sm" variant="outline" onClick={() => update("ACTIVE")} disabled={pending}>
          Reinstate
        </Button>
      )}
    </div>
  );
}
