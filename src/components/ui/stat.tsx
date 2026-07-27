import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  tone = "brand",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  tone?: "brand" | "green" | "yellow" | "red" | "purple";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  const body = (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow">
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", tones[tone])}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
