"use client";

import { useActionState } from "react";
import { createCompanyByAdmin } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function CreateCompanyForm() {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(createCompanyByAdmin, undefined);

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Company
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Company name</Label>
            <Input name="companyName" required />
          </div>
          <div>
            <Label>USDOT number (optional)</Label>
            <Input name="dotNumber" />
          </div>
          <div>
            <Label>MC number (optional)</Label>
            <Input name="mcNumber" />
          </div>
          <div>
            <Label>City (optional)</Label>
            <Input name="city" />
          </div>
          <div>
            <Label>State (optional)</Label>
            <Input name="state" maxLength={2} />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input name="phone" />
          </div>
          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Active (approved)</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Owner account
        </h3>
        <p className="mb-3 text-xs text-slate-400">
          Credentials the company owner will use to sign in. They get full
          access and can add their own managers.
        </p>
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
            <Label>Email</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input name="password" type="text" placeholder="min 8 characters" required />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create company"}
      </Button>
    </form>
  );
}
