"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  createAgreement,
  sendAgreementEmail,
  ensureAgreementLink,
  voidAgreement,
  deleteAgreement,
  addAgreementToDocuments,
} from "./agreement-actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { FileSignature, MoreVertical, Mail, Link2, FileDown, FilePlus2, Check, Ban, Trash2, Plus } from "lucide-react";

export interface AgreementRow {
  id: string;
  status: string;
  token: string | null;
  contractorName: string;
  terms: string;
  signedInfo: string;
  addedToDocuments: boolean;
}

export function AgreementsSection({
  driverId,
  driverName,
  driverEmail,
  agreements,
}: {
  driverId: string;
  driverName: string;
  driverEmail: string;
  agreements: AgreementRow[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<{ error?: string; ok?: boolean } | undefined, FormData>(
    createAgreement,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state?.ok]);

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Send the Driver Independent Contractor Agreement for {driverName} to review and sign.
        </p>
        <Button size="sm" variant={open ? "secondary" : undefined} onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4" /> {open ? "Close" : "Send agreement"}
        </Button>
      </div>

      {open && (
        <form action={action} className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3">
          <input type="hidden" name="driverId" value={driverId} />
          {state?.error && <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</div>}
          <div>
            <Label>Contractor name</Label>
            <Input name="contractorName" defaultValue={driverName} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Compensation (% of gross)</Label>
              <Input name="compensationPercent" placeholder="e.g. 30" />
            </div>
            <div>
              <Label>Or CPM (cents per mile)</Label>
              <Input name="cpm" placeholder="e.g. 0" />
            </div>
            <div>
              <Label>Security deposit ($)</Label>
              <Input name="securityDeposit" placeholder="0" />
            </div>
            <div>
              <Label>Weekly installment ($)</Label>
              <Input name="depositWeeklyInstallment" placeholder="0" />
            </div>
          </div>
          <div>
            <Label>Equipment lessor (optional)</Label>
            <Input name="equipmentLessor" placeholder="e.g. Elgin Equipment Inc." />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="sendEmail" defaultChecked className="h-4 w-4 rounded border-slate-300 text-brand-600" />
            Email the signing link to the driver {driverEmail ? `(${driverEmail})` : "(no email on file)"}
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Sending…" : "Create & send agreement"}
          </Button>
        </form>
      )}

      {agreements.length > 0 && (
        <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {agreements.map((a) => (
            <AgreementItem key={a.id} driverId={driverId} row={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AgreementItem({ driverId, row }: { driverId: string; row: AgreementRow }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [added, setAdded] = useState(row.addedToDocuments);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const run = (fn: () => Promise<{ ok?: boolean; error?: string; url?: string }>, okText: string, onOk?: () => void) => {
    setMenuOpen(false);
    start(async () => {
      setMsg(null);
      const res = await fn();
      if (res.ok) {
        onOk?.();
        setMsg({ ok: true, text: res.url ?? okText });
      } else {
        setMsg({ ok: false, text: res.error ?? "Failed" });
      }
    });
  };

  const copyLink = () =>
    run(
      async () => {
        const res = await ensureAgreementLink(row.id);
        if (res.ok && res.url) {
          try {
            await navigator.clipboard.writeText(res.url);
            return { ok: true, url: "Signing link copied to clipboard" };
          } catch {
            return { ok: true, url: res.url };
          }
        }
        return { ok: false, error: res.error };
      },
      "Copied",
    );

  const signed = row.status === "SIGNED";
  const sent = row.status === "SENT";

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-900">{row.contractorName}</div>
          <div className="text-xs text-slate-500">
            {row.terms}
            {row.signedInfo ? ` · ${row.signedInfo}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(row.status)}>{humanize(row.status)}</Badge>
          <div className="relative" ref={menuRef}>
            <Button size="sm" variant="ghost" onClick={() => setMenuOpen((v) => !v)} disabled={busy} className="px-2" title="More actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {signed && (
                  <button
                    type="button"
                    onClick={() => run(() => addAgreementToDocuments(row.id), added ? "Updated in Documents" : "Added to Documents", () => setAdded(true))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {added ? <Check className="h-4 w-4 text-green-600" /> : <FilePlus2 className="h-4 w-4" />}
                    {added ? "Update in Documents" : "Add to Documents"}
                  </button>
                )}
                {sent && (
                  <button
                    type="button"
                    onClick={() => run(() => sendAgreementEmail(row.id), "Signing link emailed")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Mail className="h-4 w-4" /> Email link to driver
                  </button>
                )}
                {row.token && (
                  <button type="button" onClick={copyLink} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                    <Link2 className="h-4 w-4" /> Copy link
                  </button>
                )}
                {row.token && (
                  <a href={`/api/agreement/${row.token}/pdf`} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                    <FileDown className="h-4 w-4" /> {signed ? "Download PDF" : "Preview PDF"}
                  </a>
                )}
                {sent && (
                  <button
                    type="button"
                    onClick={() => { if (window.confirm("Void (cancel) this agreement? The link will stop working.")) run(() => voidAgreement(row.id), "Voided"); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
                  >
                    <Ban className="h-4 w-4" /> Void
                  </button>
                )}
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => { if (window.confirm("Delete this agreement permanently? This also removes its filed document.")) run(() => deleteAgreement(row.id), "Deleted"); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {signed && row.token && (
        <a
          href={`/api/agreement/${row.token}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
        >
          <FileSignature className="h-3.5 w-3.5" /> View signed agreement (PDF)
        </a>
      )}
      {msg && (
        <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>
      )}
    </div>
  );
}
