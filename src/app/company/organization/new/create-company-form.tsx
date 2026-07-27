"use client";

import { useActionState, useState, useTransition } from "react";
import { createOrgCompany, lookupCarrierForOrg } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

export function CreateCompanyForm() {
  const [state, action, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(createOrgCompany, undefined);

  const [companyName, setCompanyName] = useState("");
  const [dotNumber, setDotNumber] = useState("");
  const [mcNumber, setMcNumber] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [phone, setPhone] = useState("");

  const [looking, startLookup] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "warn"; text: string } | null>(null);

  const doLookup = (kind: "dot" | "mc") => {
    const value = kind === "dot" ? dotNumber : mcNumber;
    if (!value.trim()) return setMsg({ kind: "err", text: "Enter a number first" });
    setMsg(null);
    startLookup(async () => {
      const res = await lookupCarrierForOrg(kind, value);
      if (!res.ok) return setMsg({ kind: "err", text: res.error });
      const c = res.info;
      if (c.legalName) setCompanyName(c.legalName);
      if (c.dotNumber) setDotNumber(c.dotNumber);
      if (c.city) setCity(c.city);
      if (c.state) setStateVal(c.state);
      if (c.phone) setPhone(c.phone);
      setMsg(
        c.allowedToOperate === "N"
          ? { kind: "warn", text: `Found: ${c.legalName} — NOT allowed to operate` }
          : { kind: "ok", text: `Found & filled: ${c.legalName}` },
      );
    });
  };

  const msgClass =
    msg?.kind === "ok"
      ? "bg-green-50 text-green-700"
      : msg?.kind === "warn"
        ? "bg-yellow-50 text-yellow-800"
        : "bg-red-50 text-red-700";

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      <p className="text-xs text-slate-400">
        Enter a USDOT or MC number and click Look up to auto-fill from FMCSA.
      </p>
      {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msgClass}`}>{msg.text}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>USDOT number</Label>
          <div className="flex gap-2">
            <Input name="dotNumber" value={dotNumber} onChange={(e) => setDotNumber(e.target.value)} inputMode="numeric" />
            <Button type="button" variant="outline" className="shrink-0" onClick={() => doLookup("dot")} disabled={looking}>
              {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Look up
            </Button>
          </div>
        </div>
        <div>
          <Label>MC number</Label>
          <div className="flex gap-2">
            <Input name="mcNumber" value={mcNumber} onChange={(e) => setMcNumber(e.target.value)} />
            <Button type="button" variant="outline" className="shrink-0" onClick={() => doLookup("mc")} disabled={looking}>
              {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Look up
            </Button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label>Company name</Label>
          <Input name="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </div>
        <div>
          <Label>City</Label>
          <Input name="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <Label>State</Label>
          <Input name="state" value={stateVal} onChange={(e) => setStateVal(e.target.value)} maxLength={2} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Add company to organization"}
      </Button>
    </form>
  );
}
