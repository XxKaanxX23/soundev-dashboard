import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  ready: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  live: "border-sky-300/30 bg-sd-accent/[0.15] text-sky-100",
  partial: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  mock: "border-sd-border-strong bg-zinc-500/10 text-zinc-300",
  "not-connected": "border-sd-border-strong bg-zinc-500/10 text-zinc-300",
  connected: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  winner: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  Winner: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  Promising: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  Watch: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  "Needs More Spend": "border-sd-border-strong bg-zinc-300/10 text-zinc-100",
  Losing: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  "No Signal Yet": "border-sd-border-strong bg-zinc-500/10 text-zinc-300",
  learning: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  launched: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  edited: "border-indigo-300/20 bg-indigo-300/10 text-indigo-100",
  filmed: "border-indigo-300/20 bg-indigo-300/10 text-indigo-100",
  scripted: "border-sd-border-strong bg-zinc-300/10 text-zinc-100",
  idea: "border-sd-border-strong bg-zinc-500/10 text-zinc-300",
  paused: "border-sd-border-strong bg-zinc-500/10 text-zinc-300",
  loser: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  error: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  attention: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  failed: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  refunded: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  succeeded: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  disconnected: "border-sd-border-strong bg-zinc-500/10 text-zinc-300",
  "setup-needed": "border-sd-border-strong bg-zinc-500/10 text-zinc-300",
  loading: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  empty: "border-sd-border-strong bg-zinc-500/10 text-zinc-300",
  healthy: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? "border-sd-border-strong bg-zinc-500/10 text-zinc-300",
      )}
    >
      {status.replaceAll("-", " ")}
    </span>
  );
}
