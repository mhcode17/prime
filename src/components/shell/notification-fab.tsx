"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MessageSquare, FileSignature, X } from "lucide-react";

export interface FabNotification {
  kind: "messages" | "documents";
  label: string;
  href: string;
  count: number;
}

const ICONS = {
  messages: MessageSquare,
  documents: FileSignature,
};

export function NotificationFab({
  notifications,
}: {
  notifications: FabNotification[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the pop-over whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const items = notifications.filter((n) => n.count > 0);
  const total = items.reduce((s, n) => s + n.count, 0);

  // Nothing to show — render nothing at all.
  if (total === 0) return null;

  return (
    <div className="fixed bottom-5 right-4 z-40 sm:bottom-6 sm:right-6">
      {/* Pop-over list */}
      {open && (
        <div className="absolute bottom-16 right-0 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            <button
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const Icon = ICONS[n.kind];
              return (
                <li key={n.kind}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-sm text-slate-700">{n.label}</span>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
                      {n.count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* The floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700 active:scale-95"
        aria-label={`${total} new notification${total === 1 ? "" : "s"}`}
      >
        <Mail className="h-6 w-6" />
        {/* count badge */}
        <span className="absolute -right-0.5 -top-0.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-xs font-bold text-white">
          {total > 9 ? "9+" : total}
        </span>
        {/* pulse ring */}
        {!open && (
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-500 opacity-40" />
        )}
      </button>
    </div>
  );
}
