import { cn } from "@/lib/utils";

export type TicketMessage = {
  id: string;
  body: string;
  fromAdmin: boolean;
  senderName: string;
  createdAt: Date;
};

function time(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketThread({
  messages,
  viewerIsAdmin,
}: {
  messages: TicketMessage[];
  viewerIsAdmin: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((m) => {
        const mine = m.fromAdmin === viewerIsAdmin;
        return (
          <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                mine
                  ? "rounded-br-sm bg-brand-600 text-white"
                  : "rounded-bl-sm bg-slate-100 text-slate-800",
              )}
            >
              <div className="whitespace-pre-wrap break-words">{m.body}</div>
            </div>
            <div className="mt-1 px-1 text-[11px] text-slate-400">
              {m.fromAdmin ? "Support" : m.senderName} · {time(m.createdAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
