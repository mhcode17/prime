"use client";

import { useActionState } from "react";
import { registerCompanyAction, type ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function CompanyRegisterForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    registerCompanyAction,
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
        <Label htmlFor="companyName">Company name</Label>
        <Input id="companyName" name="companyName" required />
      </div>
      <div>
        <Label htmlFor="dotNumber">USDOT number (optional)</Label>
        <Input id="dotNumber" name="dotNumber" />
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
        <Label htmlFor="email">Work email</Label>
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
        {pending ? "Creating account…" : "Create company account"}
      </Button>
    </form>
  );
}
