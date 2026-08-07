"use client";

import { useActionState, useRef, useState } from "react";
import { setDriverPassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { KeyRound, Eye, EyeOff } from "lucide-react";

export function DriverPasswordForm({ driverId, email }: { driverId: string; email: string }) {
  const [state, action, pending] = useActionState<{ error?: string; ok?: boolean } | undefined, FormData>(
    setDriverPassword,
    undefined,
  );
  const [show, setShow] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        const r = action(fd);
        formRef.current?.reset();
        return r;
      }}
      className="space-y-3"
    >
      <input type="hidden" name="driverId" value={driverId} />
      <div>
        <Label>Login email</Label>
        <Input value={email} disabled readOnly />
      </div>
      <div>
        <Label>New password</Label>
        <div className="relative">
          <Input name="password" type={show ? "text" : "password"} placeholder="At least 8 characters" required minLength={8} />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {state?.error && <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</div>}
      {state?.ok && <div className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">Password updated. Share it with the driver.</div>}
      <Button type="submit" size="sm" disabled={pending}>
        <KeyRound className="h-4 w-4" /> {pending ? "Saving…" : "Set new password"}
      </Button>
      <p className="text-xs text-slate-400">
        The driver can log in with this new password immediately. Existing signed-in sessions may remain active for up to 7 days.
      </p>
    </form>
  );
}
