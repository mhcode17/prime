"use client";

import { useActionState, useState } from "react";
import { createDocument } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function CreateDocumentForm() {
  const [state, action, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(createDocument, undefined);
  const [mode, setMode] = useState<"text" | "file">("text");

  return (
    <form action={action} className="space-y-4" key={state?.ok ? "reset" : "form"}>
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Document created. Send it to drivers from the list.
        </div>
      )}
      <div>
        <Label>Title</Label>
        <Input name="title" placeholder="e.g. Employment Agreement" required />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Input name="description" placeholder="Short description" />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mode === "text" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Type text
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mode === "file" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Upload PDF/file
        </button>
      </div>

      {mode === "text" ? (
        <div>
          <Label>Document body</Label>
          <Textarea
            name="body"
            rows={8}
            placeholder="Paste or type the document content the driver will read and sign…"
          />
        </div>
      ) : (
        <div>
          <Label>File (PDF, image — max 8MB)</Label>
          <Input name="file" type="file" accept=".pdf,image/*" />
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create document"}
      </Button>
    </form>
  );
}
