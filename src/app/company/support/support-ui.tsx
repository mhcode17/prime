"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTicket, replyTicket } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

export function CreateTicketForm() {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(createTicket, undefined);

  return (
    <form action={action} className="space-y-3" key={state?.ok ? "r" : "f"}>
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Ticket submitted. Support will respond shortly.
        </div>
      )}
      <div>
        <Label>Subject</Label>
        <Input name="subject" placeholder="Short summary of the issue" required />
      </div>
      <div>
        <Label>Priority</Label>
        <Select name="priority" defaultValue="NORMAL">
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </Select>
      </div>
      <div>
        <Label>Describe your issue</Label>
        <Textarea name="body" rows={5} placeholder="What do you need help with?" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit ticket"}
      </Button>
    </form>
  );
}

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(replyTicket, undefined);
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
        <Textarea name="body" rows={1} placeholder="Reply to support…" className="min-h-[42px] resize-none" required />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
