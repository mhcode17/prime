"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PdfCanvas, type PageSize } from "@/components/pdf/pdf-canvas";
import { FIELD_META, FIELD_TYPES, type FieldType } from "@/lib/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveFields, type FieldInput } from "./actions";
import { X, GripVertical } from "lucide-react";

interface EditorField {
  tid: string;
  type: FieldType;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

const CATEGORY_COLOR: Record<string, string> = {
  signature: "border-brand-500 bg-brand-50/80 text-brand-700",
  auto: "border-emerald-500 bg-emerald-50/80 text-emerald-700",
  input: "border-amber-500 bg-amber-50/80 text-amber-700",
};

let counter = 0;
const nextId = () => `f${Date.now().toString(36)}_${counter++}`;

export function FieldEditor({
  documentId,
  dataUrl,
  initial,
}: {
  documentId: string;
  dataUrl: string;
  initial: EditorField[];
}) {
  const router = useRouter();
  const [fields, setFields] = useState<EditorField[]>(initial);
  const [armed, setArmed] = useState<FieldType | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const drag = useRef<null | {
    mode: "move" | "resize";
    tid: string;
    startX: number;
    startY: number;
    rectW: number;
    rectH: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>(null);

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  const addField = (page: number, px: number, py: number) => {
    if (!armed) return;
    const meta = FIELD_META[armed];
    const w = meta.defaultW;
    const h = meta.defaultH;
    setFields((prev) => [
      ...prev,
      {
        tid: nextId(),
        type: armed,
        page,
        x: clamp(px - w / 2, 0, 1 - w),
        y: clamp(py - h / 2, 0, 1 - h),
        w,
        h,
        label: meta.label,
      },
    ]);
  };

  const onOverlayPointerDown = (
    e: React.PointerEvent,
    page: number,
  ) => {
    if (!armed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    addField(page, px, py);
  };

  const beginDrag = (
    e: React.PointerEvent,
    tid: string,
    mode: "move" | "resize",
  ) => {
    e.stopPropagation();
    const pageEl = (e.currentTarget as HTMLElement).closest(
      "[data-page-overlay]",
    ) as HTMLElement | null;
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const f = fields.find((x) => x.tid === tid)!;
    drag.current = {
      mode,
      tid,
      startX: e.clientX,
      startY: e.clientY,
      rectW: rect.width,
      rectH: rect.height,
      origX: f.x,
      origY: f.y,
      origW: f.w,
      origH: f.h,
    };
    setSelected(tid);
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
  };

  const onDragMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / d.rectW;
    const dy = (e.clientY - d.startY) / d.rectH;
    setFields((prev) =>
      prev.map((f) => {
        if (f.tid !== d.tid) return f;
        if (d.mode === "move") {
          return {
            ...f,
            x: clamp(d.origX + dx, 0, 1 - f.w),
            y: clamp(d.origY + dy, 0, 1 - f.h),
          };
        }
        return {
          ...f,
          w: clamp(d.origW + dx, 0.04, 1 - f.x),
          h: clamp(d.origH + dy, 0.02, 1 - f.y),
        };
      }),
    );
  };

  const onDragEnd = () => {
    drag.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
  };

  const removeField = (tid: string) =>
    setFields((prev) => prev.filter((f) => f.tid !== tid));

  const updateLabel = (tid: string, label: string) =>
    setFields((prev) => prev.map((f) => (f.tid === tid ? { ...f, label } : f)));

  const save = () =>
    start(async () => {
      const payload: FieldInput[] = fields.map((f) => ({
        type: f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        w: f.w,
        h: f.h,
        label: f.label,
      }));
      await saveFields(documentId, payload);
      setSaved(true);
      router.refresh();
    });

  const renderOverlay = (pageIndex: number, _size: PageSize) => (
    <div
      data-page-overlay
      className={armed ? "h-full w-full cursor-crosshair" : "h-full w-full"}
      onPointerDown={(e) => onOverlayPointerDown(e, pageIndex)}
    >
      {fields
        .filter((f) => f.page === pageIndex)
        .map((f) => {
          const cat = FIELD_META[f.type].category;
          const isSel = selected === f.tid;
          return (
            <div
              key={f.tid}
              className={`absolute flex items-center justify-center rounded border-2 text-[10px] font-medium ${CATEGORY_COLOR[cat]} ${isSel ? "ring-2 ring-offset-1 ring-slate-800" : ""}`}
              style={{
                left: `${f.x * 100}%`,
                top: `${f.y * 100}%`,
                width: `${f.w * 100}%`,
                height: `${f.h * 100}%`,
                cursor: "move",
              }}
              onPointerDown={(e) => beginDrag(e, f.tid, "move")}
            >
              <GripVertical className="pointer-events-none absolute left-0 h-3 w-3 opacity-40" />
              <span className="pointer-events-none truncate px-2">
                {f.type === "TEXT" ? f.label : FIELD_META[f.type].label}
              </span>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  removeField(f.tid);
                }}
                className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <X className="h-2.5 w-2.5" />
              </button>
              <div
                onPointerDown={(e) => beginDrag(e, f.tid, "resize")}
                className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm border border-white bg-slate-700"
              />
            </div>
          );
        })}
    </div>
  );

  const selectedField = fields.find((f) => f.tid === selected);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-4">
        <PdfCanvas dataUrl={dataUrl} renderPageOverlay={renderOverlay} />
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Add a field</h3>
          <p className="mb-3 text-xs text-slate-500">
            {armed
              ? "Click on the document to place. Click the type again to stop."
              : "Pick a field type, then click on the document."}
          </p>
          <div className="space-y-3">
            {(["signature", "auto", "input"] as const).map((cat) => (
              <div key={cat}>
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {cat === "signature" ? "Signature" : cat === "auto" ? "Auto-filled from profile" : "Driver input"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FIELD_TYPES.filter((t) => FIELD_META[t].category === cat).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setArmed(armed === t ? null : t)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium ${
                        armed === t
                          ? "border-slate-800 bg-slate-800 text-white"
                          : `${CATEGORY_COLOR[cat]} hover:opacity-80`
                      }`}
                    >
                      {FIELD_META[t].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedField && selectedField.type === "TEXT" && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Text field label</h3>
            <Input
              value={selectedField.label}
              onChange={(e) => updateLabel(selectedField.tid, e.target.value)}
              placeholder="e.g. Middle name"
            />
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm text-slate-600">
            {fields.length} field{fields.length === 1 ? "" : "s"} placed
          </div>
          <Button onClick={save} disabled={pending} className="w-full">
            {pending ? "Saving…" : "Save field layout"}
          </Button>
          {saved && (
            <p className="mt-2 text-center text-xs text-green-600">Layout saved.</p>
          )}
        </div>
      </div>
    </div>
  );
}
