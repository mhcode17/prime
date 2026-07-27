"use client";

import { useActionState, useState, useTransition } from "react";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createMember,
  grantMembership,
  revokeMembership,
  setMemberActive,
  removeMember,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Company = { id: string; name: string };

function PermissionChecklist({ namePrefix }: { namePrefix: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PERMISSIONS.map((p) => (
        <label key={p.key} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 text-sm">
          <input
            type="checkbox"
            name={`${namePrefix}${p.key}`}
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

export function AddMemberForm({ companies }: { companies: Company[] }) {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(createMember, undefined);

  return (
    <form action={action} className="space-y-4" key={state?.ok ? "r" : "f"}>
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Member added. They can sign in and will land on the assigned company.
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
          <Input name="password" type="text" placeholder="min 8 characters" required />
        </div>
      </div>
      <div>
        <Label>Assign to company</Label>
        <Select name="companyId" required defaultValue="">
          <option value="" disabled>Select a company…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Access / permissions for that company</Label>
        <PermissionChecklist namePrefix="perm_" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add member"}
      </Button>
    </form>
  );
}

/** Editable permission chips for one user's membership in one company. */
export function MembershipEditor({
  userId,
  companyId,
  companyName,
  current,
}: {
  userId: string;
  companyId: string;
  companyName: string;
  current: string[];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(current));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      setSaved(false);
      return next;
    });

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800">{companyName}</span>
        <button
          type="button"
          onClick={() => start(() => void revokeMembership(userId, companyId))}
          disabled={pending}
          className="text-xs text-red-600 hover:underline"
        >
          Revoke access
        </button>
      </div>
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
      <div className="mt-2 flex items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await grantMembership(userId, companyId, Array.from(checked));
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

/** Grant a user access to a company they don't have yet. */
export function GrantCompanyForm({
  userId,
  companies,
}: {
  userId: string;
  companies: Company[];
}) {
  const [companyId, setCompanyId] = useState("");
  const [pending, start] = useTransition();

  if (companies.length === 0) {
    return <p className="text-xs text-slate-400">Has access to all companies.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={companyId}
        onChange={(e) => setCompanyId(e.target.value)}
        className="h-9 py-1.5 text-sm"
      >
        <option value="">Grant access to…</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>
      <Button
        size="sm"
        disabled={pending || !companyId}
        onClick={() =>
          start(async () => {
            await grantMembership(userId, companyId, []);
            setCompanyId("");
          })
        }
      >
        Add
      </Button>
    </div>
  );
}

export function MemberRowActions({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      <Button size="sm" variant={isActive ? "outline" : "secondary"} disabled={pending} onClick={() => start(() => void setMemberActive(userId, !isActive))}>
        {isActive ? "Disable" : "Enable"}
      </Button>
      <Button size="sm" variant="danger" disabled={pending} onClick={() => start(() => void removeMember(userId))}>
        Remove
      </Button>
    </div>
  );
}
