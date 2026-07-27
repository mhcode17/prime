"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendCompanyMessage } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function CompanyComposer({ driverId }: { driverId: string }) {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(sendCompanyMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending) formRef.current?.reset();
  }, [pending]);

  return (
    <form ref={formRef} action={action} className="border-t border-slate-200 p-3">
      {state?.error && (
        <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</div>
      )}
      <input type="hidden" name="driverId" value={driverId} />
      <div className="flex items-end gap-2">
        <Textarea
          name="body"
          rows={1}
          placeholder="Type a message to the driver…"
          className="min-h-[42px] resize-none"
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
