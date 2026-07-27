"use client";

import { useActionState } from "react";
import { updateDriverInfo } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Props = {
  driverId: string;
  phone: string | null;
  dateOfBirth: string | null;
  licenseNumber: string | null;
  licenseState: string | null;
  licenseClass: string | null;
  licenseExpiry: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export function DriverInfoForm(p: Props) {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(updateDriverInfo, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="driverId" value={p.driverId} />
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Phone</Label>
          <Input name="phone" defaultValue={p.phone ?? ""} />
        </div>
        <div>
          <Label>Date of birth</Label>
          <Input name="dateOfBirth" type="date" defaultValue={p.dateOfBirth ?? ""} />
        </div>
        <div>
          <Label>License number</Label>
          <Input name="licenseNumber" defaultValue={p.licenseNumber ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>License state</Label>
            <Input name="licenseState" defaultValue={p.licenseState ?? ""} maxLength={2} />
          </div>
          <div>
            <Label>Class</Label>
            <Input name="licenseClass" defaultValue={p.licenseClass ?? ""} maxLength={1} />
          </div>
        </div>
        <div>
          <Label>License expiry</Label>
          <Input name="licenseExpiry" type="date" defaultValue={p.licenseExpiry ?? ""} />
        </div>
        <div>
          <Label>Address</Label>
          <Input name="address" defaultValue={p.address ?? ""} />
        </div>
        <div className="grid grid-cols-3 gap-2">
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
        <div>
          <Label>Emergency contact name</Label>
          <Input name="emergencyContactName" defaultValue={p.emergencyContactName ?? ""} />
        </div>
        <div>
          <Label>Emergency contact phone</Label>
          <Input name="emergencyContactPhone" defaultValue={p.emergencyContactPhone ?? ""} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
