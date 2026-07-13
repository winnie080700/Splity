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
        "flex min-h-[84px] items-center gap-2.5 rounded-[14px] border px-3 py-3 sm:min-h-[104px] sm:gap-4 sm:px-5 sm:py-4",
        accent
          ? "border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50"
          : "border-[var(--splity-line)] bg-white",
      ].join(" ")}>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 sm:h-12 sm:w-12">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[var(--splity-muted)] sm:text-xs">
          {label}
        </p>
        <div className="splity-display mt-0.5 truncate text-xl font-extrabold tracking-tight text-[var(--splity-ink)] sm:mt-1 sm:text-2xl">
          {value}
        </div>
        {sub ? <p className="mt-1 text-xs font-semibold text-[var(--splity-rose)]">{sub}</p> : null}
      </div>
    </div>
  );
}
