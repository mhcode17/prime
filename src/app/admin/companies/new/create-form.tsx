"use client";

import { useActionState, useState, useTransition } from "react";
import { createCompanyByAdmin, lookupCarrier } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

export function CreateCompanyForm() {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(createCompanyByAdmin, undefined);

  // Controlled company fields so lookups can populate them.
  const [companyName, setCompanyName] = useState("");
  const [dotNumber, setDotNumber] = useState("");
  const [mcNumber, setMcNumber] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [phone, setPhone] = useState("");

  const [looking, startLookup] = useTransition();
  const [lookupMsg, setLookupMsg] = useState<
    { kind: "ok" | "err" | "warn"; text: string } | null
  >(null);

  const doLookup = (kind: "dot" | "mc") => {
    const value = kind === "dot" ? dotNumber : mcNumber;
    if (!value.trim()) {
      setLookupMsg({ kind: "err", text: "Enter a number first" });
      return;
    }
    setLookupMsg(null);
    startLookup(async () => {
      const res = await lookupCarrier(kind, value);
      if (!res.ok) {
        setLookupMsg({ kind: "err", text: res.error });
        return;
      }
      const c = res.info;
      if (c.legalName) setCompanyName(c.legalName);
      if (c.dotNumber) setDotNumber(c.dotNumber);
      if (c.city) setCity(c.city);
      if (c.state) setStateVal(c.state);
      if (c.phone) setPhone(c.phone);
      setLookupMsg(
        c.allowedToOperate === "N"
          ? { kind: "warn", text: `Found: ${c.legalName} — note: NOT allowed to operate` }
          : { kind: "ok", text: `Found & filled: ${c.legalName}` },
      );
    });
  };

  const msgClass =
    lookupMsg?.kind === "ok"
      ? "bg-green-50 text-green-700"
      : lookupMsg?.kind === "warn"
        ? "bg-yellow-50 text-yellow-800"
        : "bg-red-50 text-red-700";

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Company
        </h3>
        <p className="mb-3 text-xs text-slate-400">
          Enter a USDOT or MC number and click{" "}
          <span className="font-medium">Look up</span> to auto-fill from FMCSA.
        </p>

        {lookupMsg && (
          <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${msgClass}`}>
            {lookupMsg.text}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>USDOT number</Label>
            <div className="flex gap-2">
              <Input
                name="dotNumber"
                value={dotNumber}
                onChange={(e) => setDotNumber(e.target.value)}
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => doLookup("dot")}
                disabled={looking}
              >
                {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Look up
              </Button>
            </div>
          </div>
          <div>
            <Label>MC number</Label>
            <div className="flex gap-2">
              <Input
                name="mcNumber"
                value={mcNumber}
                onChange={(e) => setMcNumber(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => doLookup("mc")}
                disabled={looking}
              >
                {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Look up
              </Button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Company name</Label>
            <Input
              name="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>City</Label>
            <Input name="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label>State</Label>
            <Input
              name="state"
              value={stateVal}
              onChange={(e) => setStateVal(e.target.value)}
              maxLength={2}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
