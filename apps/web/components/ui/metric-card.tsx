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
        "flex min-h-[104px] items-center gap-4 rounded-[14px] border px-5 py-4",
        accent
          ? "border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50"
          : "border-[var(--splity-line)] bg-white",
      ].join(" ")}>
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--splity-muted)]">
          {label}
        </p>
        <div className="splity-display mt-1 truncate text-2xl font-extrabold tracking-tight text-[var(--splity-ink)]">
          {value}
        </div>
        {sub ? <p className="mt-1 text-xs font-semibold text-[var(--splity-rose)]">{sub}</p> : null}
      </div>
    </div>
  );
}
