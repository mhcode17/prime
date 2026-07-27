"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItems, type ShellRole } from "./nav";

function isActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  if (href === "/company" || href === "/driver" || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  role,
  permissions = [],
  isOwner = false,
  isOrgAdmin = false,
}: {
  role: ShellRole;
  permissions?: string[];
  isOwner?: boolean;
  isOrgAdmin?: boolean;
}) {
  const pathname = usePathname();
  const items = getNavItems(role, { permissions, isOwner, isOrgAdmin });

  // Manual open/close overrides per group href; otherwise a group is open
  // only when one of its children is active.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggle = (href: string, fallback: boolean) =>
    setOpenMap((m) => ({ ...m, [href]: !(m[href] ?? fallback) }));

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-6 text-lg font-bold text-slate-900">
        <Truck className="h-6 w-6 text-brand-600" />
        Trucking CRM
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const hasActiveChild = item.children?.some((c) =>
            isActive(pathname, c.href, true),
          );

          if (item.children) {
            const open = openMap[item.href] ?? !!hasActiveChild;
            return (
              <div key={item.href}>
                <button
                  type="button"
                  onClick={() => toggle(item.href, !!hasActiveChild)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    hasActiveChild
                      ? "text-brand-700"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 text-slate-400 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>
                {open && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-slate-100 pl-3">
                    {item.children.map((child) => {
                      const childActive = isActive(pathname, child.href, true);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                            childActive
                              ? "bg-brand-50 font-medium text-brand-700"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                          )}
                        >
                          <child.icon className="h-4 w-4" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
