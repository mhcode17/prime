"use client";

import { useActionState } from "react";
import { createDriver } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function CreateDriverForm() {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(createDriver, undefined);

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Driver
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>First name</Label>
            <Input name="firstName" required />
          </div>
          <div>
            <Label>Last name</Label>
            <Input name="lastName" required />
          </div>
          <div>
            <Label>Email (login)</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input name="phone" />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input name="password" type="text" placeholder="min 8 characters" required />
          </div>
          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue="PENDING">
              <option value="PENDING">Pending (in hiring)</option>
              <option value="ACTIVE">Active (hired)</option>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Details (optional)
        </h3>
        <p className="mb-3 text-xs text-slate-400">
          Used to auto-fill signed documents. Can be edited later on the driver&apos;s profile.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Date of birth</Label>
            <Input name="dateOfBirth" type="date" />
          </div>
          <div>
            <Label>License number</Label>
            <Input name="licenseNumber" />
          </div>
          <div>
            <Label>License state</Label>
            <Input name="licenseState" maxLength={2} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Add driver"}
      </Button>
    </form>
  );
}
