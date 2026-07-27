"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronsUpDown } from "lucide-react";
import { switchCompany } from "@/app/company/switch-actions";

export function CompanySwitcher({
  companies,
  activeId,
}: {
  companies: { id: string; name: string }[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (companies.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Building2 className="h-4 w-4 text-slate-400" />
        {companies[0]?.name}
      </div>
    );
  }

  return (
    <div className="relative">
      <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <ChevronsUpDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <select
        value={activeId}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await switchCompany(e.target.value);
            router.refresh();
          })
        }
        className="appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-8 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        title="Switch company"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
