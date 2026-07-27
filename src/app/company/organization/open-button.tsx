"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { switchCompany } from "../switch-actions";

export function OpenCompanyButton({
  companyId,
  active,
}: {
  companyId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (active) {
    return <span className="text-xs font-medium text-green-600">Current</span>;
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await switchCompany(companyId);
          router.push("/company");
        })
      }
    >
      {pending ? "Opening…" : "Open"}
    </Button>
  );
}
