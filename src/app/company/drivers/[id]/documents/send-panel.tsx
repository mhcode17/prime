"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { sendDocument } from "@/app/company/documents/actions";
import { Button } from "@/components/ui/button";

type Doc = { id: string; title: string };

export function SendDocToDriver({
  driverId,
  documents,
}: {
  driverId: string;
  documents: Doc[];
}) {
  const [pending, start] = useTransition();
  const [sentId, setSentId] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No more documents to send.{" "}
        <Link href="/company/documents" className="text-brand-600 hover:underline">
          Create a document →
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((d) => (
        <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
          <span className="truncate text-sm text-slate-800">{d.title}</span>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await sendDocument(d.id, [driverId]);
                setSentId(d.id);
              })
            }
          >
            {sentId === d.id ? "Sent ✓" : "Send"}
          </Button>
        </div>
      ))}
      <p className="pt-1 text-xs text-slate-400">
        Sends the document to this driver to e-sign.
      </p>
    </div>
  );
}
