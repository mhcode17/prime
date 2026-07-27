"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setUserActive } from "../companies/actions";

export function UserActiveToggle({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={isActive ? "danger" : "outline"}
      disabled={pending}
      onClick={() => start(() => void setUserActive(userId, !isActive))}
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
