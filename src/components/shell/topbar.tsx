import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import { LogOut } from "lucide-react";

export function Topbar({
  name,
  email,
  subtitle,
}: {
  name: string;
  email: string;
  subtitle?: string;
}) {
  const [first, ...rest] = name.split(" ");
  return (
    <header className="hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-6 lg:flex">
      <div className="text-sm text-slate-500">{subtitle}</div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-medium text-slate-900">{name}</div>
          <div className="text-xs text-slate-500">{email}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {initials(first, rest.join(" "))}
        </div>
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" type="submit" title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
