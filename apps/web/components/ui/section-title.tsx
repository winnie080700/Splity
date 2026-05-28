import { ReactNode } from "react";

export function SectionTitle({
  badge,
  body,
  kicker,
  title,
}: {
  badge?: ReactNode;
  body?: ReactNode;
  kicker: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--splity-gold-strong)]" />
        {kicker}
      </p>
      <h2 className="min-w-0 break-words splity-display text-xl font-bold tracking-tight text-[var(--splity-ink)] sm:text-2xl">
        {title}
      </h2>
      {badge ? (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-[var(--splity-gold-strong)]">
          {badge}
        </span>
      ) : null}
      {body ? (
        <p className="basis-full text-sm leading-6 text-[var(--splity-muted)]">
          {body}
        </p>
      ) : null}
    </div>
  );
}
