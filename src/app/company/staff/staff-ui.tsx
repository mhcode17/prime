"use client";

import { useActionState, useState, useTransition } from "react";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createManager,
  updateManagerPermissions,
  setManagerActive,
  removeManager,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function PermissionChecklist({
  namePrefix,
  defaults,
}: {
  namePrefix: string;
  defaults: string[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PERMISSIONS.map((p) => (
        <label key={p.key} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 text-sm">
          <input
            type="checkbox"
            name={`${namePrefix}${p.key}`}
            defaultChecked={defaults.includes(p.key)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          <span>
            <span className="font-medium text-slate-800">{p.label}</span>
            <span className="block text-xs text-slate-400">{p.desc}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function AddManagerForm() {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(createManager, undefined);

  return (
    <form action={action} className="space-y-4" key={state?.ok ? "r" : "f"}>
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Manager added. They can now sign in with the email &amp; password you set.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>First name</Label>
          <Input name="firstName" required />
        </div>
        <div>
          <Label>Last name</Label>
          <Input name="lastName" required />
        </div>
      </div>
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Phone (optional)</Label>
          <Input name="phone" />
        </div>
        <div>
          <Label>Temporary password</Label>
          <Input name="password" type="text" placeholder="min 8 chars" required />
        </div>
      </div>
      <div>
        <Label>Access / permissions</Label>
        <PermissionChecklist namePrefix="perm_" defaults={[]} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add manager"}
      </Button>
    </form>
  );
}

export function ManagerPermissionsEditor({
  userId,
  current,
}: {
  userId: string;
  current: string[];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(current));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setSaved(false);
      return next;
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PERMISSIONS.map((p) => {
          const on = checked.has(p.key);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => toggle(p.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await updateManagerPermissions(userId, Array.from(checked));
              setSaved(true);
            })
          }
        >
          {pending ? "Saving…" : "Save access"}
        </Button>
        {saved && <span className="text-xs text-green-600">Saved</span>}
      </div>
    </div>
  );
}

export function ManagerRowActions({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant={isActive ? "outline" : "secondary"}
        disabled={pending}
        onClick={() => start(() => void setManagerActive(userId, !isActive))}
      >
        {isActive ? "Disable" : "Enable"}
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() => start(() => void removeManager(userId))}
      >
        Remove
      </Button>
    </div>
  );
}
