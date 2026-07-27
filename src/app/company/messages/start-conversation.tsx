"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

type Driver = { id: string; name: string };

export function StartConversation({ drivers }: { drivers: Driver[] }) {
  const router = useRouter();
  const [driverId, setDriverId] = useState("");

  return (
    <div className="flex items-center gap-2">
      <Select
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
        className="h-9 w-56 py-1.5 text-sm"
      >
        <option value="">Start chat with driver…</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </Select>
      <Button
        disabled={!driverId}
        onClick={() => driverId && router.push(`/company/messages/${driverId}`)}
      >
        Open chat
      </Button>
    </div>
  );
}
