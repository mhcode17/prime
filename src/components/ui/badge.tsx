import { cn } from "@/lib/utils";

type Tone =
  | "gray"
  | "green"
  | "yellow"
  | "red"
  | "blue"
  | "purple"
  | "orange";

const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
  orange: "bg-orange-100 text-orange-800",
};

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// Central mapping of domain statuses -> badge tone + label
export function statusTone(status: string): Tone {
  const map: Record<string, Tone> = {
    // Driver / company
    ACTIVE: "green",
    PENDING: "yellow",
    TERMINATED: "red",
    SUSPENDED: "red",
    // Signature
    SENT: "blue",
    VIEWED: "purple",
    SIGNED: "green",
    DECLINED: "red",
    VOIDED: "gray",
    // Screening / generic
    REQUESTED: "yellow",
    IN_PROGRESS: "blue",
    COMPLETED: "green",
    FAILED: "red",
    // Drug test
    ORDERED: "yellow",
    SCHEDULED: "blue",
    COMPLETED_NEGATIVE: "green",
    COMPLETED_POSITIVE: "red",
    CANCELLED: "gray",
    // Clearinghouse
    CONSENT_PENDING: "yellow",
    COMPLETED_CLEAR: "green",
    COMPLETED_VIOLATION: "red",
    // Appointment
    OPEN: "blue",
    BOOKED: "purple",
    NO_SHOW: "orange",
    // Support tickets
    RESOLVED: "green",
    CLOSED: "gray",
    // Ticket priority
    LOW: "gray",
    NORMAL: "blue",
    HIGH: "orange",
    URGENT: "red",
    // Equipment
    AVAILABLE: "green",
    ASSIGNED: "blue",
    MAINTENANCE: "orange",
    OUT_OF_SERVICE: "red",
  };
  return map[status] ?? "gray";
}

export function humanize(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
