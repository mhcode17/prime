"use client";

import { useActionState } from "react";
import { updateCompany } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Props = {
  name: string;
  dotNumber: string | null;
  mcNumber: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export function CompanySettingsForm(p: Props) {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(updateCompany, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Company details saved.</div>
      )}
      <div>
        <Label>Company name</Label>
        <Input name="name" defaultValue={p.name} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>USDOT number</Label>
          <Input name="dotNumber" defaultValue={p.dotNumber ?? ""} />
        </div>
        <div>
          <Label>MC number</Label>
          <Input name="mcNumber" defaultValue={p.mcNumber ?? ""} />
        </div>
      </div>
      <div>
        <Label>Phone</Label>
        <Input name="phone" defaultValue={p.phone ?? ""} />
      </div>
      <div>
        <Label>Address</Label>
        <Input name="address" defaultValue={p.address ?? ""} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>City</Label>
          <Input name="city" defaultValue={p.city ?? ""} />
        </div>
        <div>
          <Label>State</Label>
          <Input name="state" defaultValue={p.state ?? ""} maxLength={2} />
        </div>
        <div>
          <Label>ZIP</Label>
          <Input name="zip" defaultValue={p.zip ?? ""} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save company details"}
      </Button>
    </form>
  );
}
