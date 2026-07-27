"use client";

import { useActionState } from "react";
import { registerDriverAction, type ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Company = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

export function DriverRegisterForm({ companies }: { companies: Company[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    registerDriverAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <div>
        <Label htmlFor="companyId">Company you&apos;re applying to</Label>
        <Select id="companyId" name="companyId" required defaultValue="">
          <option value="" disabled>
            {companies.length ? "Select a company…" : "No companies available yet"}
          </option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.state ? ` — ${c.city ?? ""} ${c.state}` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Sign up as driver"}
      </Button>
    </form>
  );
}
