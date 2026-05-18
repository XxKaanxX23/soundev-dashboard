import { ArrowRight } from "lucide-react";

export function NextActionsPanel({
  actions,
}: {
  actions: { title: string; body: string }[];
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950 p-4 shadow-sm shadow-black/20">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-50">Next Actions</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Plain-English priorities based on the current business signals.
        </p>
      </div>
      <div className="space-y-3">
        {actions.map((action) => (
          <article key={action.title} className="rounded-md border border-white/10 bg-black/30 p-3">
            <div className="flex items-start gap-3">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{action.title}</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-500">{action.body}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
