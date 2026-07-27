"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "All Drivers", href: "/company/drivers" },
  { label: "Pending Drivers", href: "/company/drivers/pending" },
  { label: "Terminated Drivers", href: "/company/drivers/terminated" },
];

export function DriverTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex gap-1 border-b border-slate-200">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
