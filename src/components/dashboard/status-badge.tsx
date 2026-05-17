import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  ready: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  connected: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  winner: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  learning: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  launched: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  edited: "border-indigo-300/20 bg-indigo-300/10 text-indigo-100",
  filmed: "border-indigo-300/20 bg-indigo-300/10 text-indigo-100",
  scripted: "border-zinc-300/20 bg-zinc-300/10 text-zinc-100",
  idea: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  paused: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  loser: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  error: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  attention: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  failed: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  refunded: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  succeeded: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  disconnected: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  "setup-needed": "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  loading: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  empty: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  healthy: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
      )}
    >
      {status.replaceAll("-", " ")}
    </span>
  );
}
