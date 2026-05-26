import { ReactNode } from "react";

export function MetricCard({
  accent,
  icon,
  label,
  sub,
  value,
}: {
  accent?: boolean;
  icon: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  value: ReactNode;
}) {
  return (
    <div
      className={[
        "min-h-[86px] rounded-[14px] border px-4 py-3",
        accent
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/70"
          : "border-[var(--splity-line)] bg-[var(--splity-bg)]/35",
      ].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
          {label}
        </p>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-[var(--splity-line)] bg-white text-[var(--splity-muted)]">
          {icon}
        </span>
      </div>
      <div className="splity-display mt-2 text-3xl font-extrabold tracking-tight text-[var(--splity-ink)]">
        {value}
      </div>
      {sub ? (
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--splity-rose)]">
          {sub}
        </p>
      ) : null}
    </div>
  );
}
