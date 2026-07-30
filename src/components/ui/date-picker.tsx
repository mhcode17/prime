"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toUS(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}
function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayISO(): string {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
}

/** Custom MM/DD/YYYY date picker (locale-independent). Submits ISO yyyy-mm-dd
 *  via a hidden input named `name`. */
export function DatePicker({
  name,
  defaultValue = "",
  placeholder = "MM/DD/YYYY",
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const start = defaultValue ? new Date(defaultValue + "T00:00:00") : new Date();
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prev = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const next = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  const today = todayISO();
  const nowY = new Date().getFullYear();
  const years: number[] = [];
  for (let y = nowY + 1; y >= nowY - 50; y--) years.push(y);

  return (
    <div className="relative" ref={ref}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value ? toUS(value) : placeholder}
        </span>
        <Calendar className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center gap-1">
            <button type="button" onClick={prev} className="rounded p-1 text-slate-500 hover:bg-slate-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <select
              value={view.m}
              onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}
              className="flex-1 rounded border border-slate-200 bg-white px-1 py-1 text-xs"
            >
              {MONTHS.map((mo, i) => (
                <option key={mo} value={i}>{mo}</option>
              ))}
            </select>
            <select
              value={view.y}
              onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}
              className="rounded border border-slate-200 bg-white px-1 py-1 text-xs"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="button" onClick={next} className="rounded p-1 text-slate-500 hover:bg-slate-100">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const cellISO = iso(view.y, view.m, d);
              const selected = cellISO === value;
              const isToday = cellISO === today;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setValue(cellISO);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-8 rounded-md text-sm",
                    selected
                      ? "bg-brand-600 font-semibold text-white"
                      : isToday
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
              className="mt-2 w-full rounded-md py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
