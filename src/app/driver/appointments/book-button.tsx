"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { bookSlot, cancelMyBooking } from "./actions";

export function BookButton({ appointmentId }: { appointmentId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" disabled={pending} onClick={() => start(() => void bookSlot(appointmentId))}>
      {pending ? "Booking…" : "Book this slot"}
    </Button>
  );
}

export function CancelBookingButton({ appointmentId }: { appointmentId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => start(() => void cancelMyBooking(appointmentId))}
    >
      {pending ? "Cancelling…" : "Cancel"}
    </Button>
  );
}
