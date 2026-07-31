"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { deleteDriverDocument } from "./actions";

export function DocumentRowMenu({ assignmentId, title }: { assignmentId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const remove = () => {
    setOpen(false);
    if (!window.confirm(`Delete "${title}" from this driver's documents? This cannot be undone.`)) return;
    start(async () => {
      setErr(null);
      const res = await deleteDriverDocument(assignmentId);
      if (!res.ok) setErr(res.error ?? "Failed to delete");
    });
  };

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        title="More actions"
        className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={remove}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
      {err && <div className="absolute right-0 mt-1 w-48 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{err}</div>}
    </div>
  );
}
