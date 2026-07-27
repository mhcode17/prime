"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import type { TicketStatus } from "@prisma/client";
import { replyAdminTicket, setTicketStatus } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function AdminReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(replyAdminTicket, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending) ref.current?.reset();
  }, [pending]);

  return (
    <form ref={ref} action={action} className="border-t border-slate-200 p-3">
      {state?.error && (
        <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</div>
      )}
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="flex items-end gap-2">
        <Textarea name="body" rows={1} placeholder="Reply as support…" className="min-h-[42px] resize-none" required />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Send"}
        </Button>
      </div>
    </form>
  );
}

export function TicketStatusControls({
  ticketId,
  status,
}: {
  ticketId: string;
  status: TicketStatus;
}) {
  const [pending, start] = useTransition();
  const set = (s: TicketStatus) => start(() => void setTicketStatus(ticketId, s));

  return (
    <div className="flex gap-1">
      {status !== "RESOLVED" && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => set("RESOLVED")}>
          Mark resolved
        </Button>
      )}
      {status !== "CLOSED" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => set("CLOSED")}>
          Close
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => set("OPEN")}>
          Reopen
        </Button>
      )}
    </div>
  );
}
