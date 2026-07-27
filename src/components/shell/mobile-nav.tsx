"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, Menu, X, LogOut } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { getNavItems, type ShellRole } from "./nav";
import { logoutAction } from "@/lib/auth/actions";

function isActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  if (href === "/company" || href === "/driver" || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileNav({
  role,
  permissions = [],
  isOwner = false,
  isOrgAdmin = false,
  name,
  email,
  subtitle,
}: {
  role: ShellRole;
  permissions?: string[];
  isOwner?: boolean;
  isOrgAdmin?: boolean;
  name: string;
  email: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = getNavItems(role, { permissions, isOwner, isOrgAdmin });

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const [first, ...rest] = name.split(" ");

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Truck className="h-5 w-5 text-brand-600" />
          Trucking CRM
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {initials(first, rest.join(" "))}
        </div>
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Truck className="h-5 w-5 text-brand-600" />
                Trucking CRM
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {subtitle && (
              <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                {subtitle}
              </div>
            )}

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
              {items.map((item) => {
                const active = isActive(pathname, item.href, !!item.children);
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                    {item.children && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-slate-100 pl-3">
                        {item.children.map((child) => {
                          const childActive = isActive(pathname, child.href, true);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                                childActive
                                  ? "bg-brand-50 font-medium text-brand-700"
                                  : "text-slate-500 hover:bg-slate-100",
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
              })}
            </nav>

            <div className="border-t border-slate-100 p-3">
              <div className="mb-2 px-2">
                <div className="text-sm font-medium text-slate-900">{name}</div>
                <div className="truncate text-xs text-slate-500">{email}</div>
              </div>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
