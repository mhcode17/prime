import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import type { DriverStatus } from "@prisma/client";

/** Shared header for per-driver module sub-pages. */
export function DriverModuleHeader({
  driverId,
  name,
  status,
  title,
  description,
}: {
  driverId: string;
  name: string;
  status: DriverStatus;
  title: string;
  description?: string;
}) {
  return (
    <>
      <Link
        href={`/company/drivers/${driverId}`}
        className="mb-4 inline-block text-sm text-brand-600 hover:underline"
      >
        ← Back to {name}
      </Link>
      <PageHeader
        title={title}
        description={description}
        actions={<Badge tone={statusTone(status)}>{humanize(status)}</Badge>}
      />
    </>
  );
}
