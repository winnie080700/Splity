type EmptyStateProps = {
  action?: React.ReactNode;
  description: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
  title: React.ReactNode;
};

export function EmptyState({ action, compact = false, description, icon, title }: EmptyStateProps) {
  return (
    <div className={`rounded-xl border border-dashed border-[var(--splity-line-strong)] bg-white ${compact ? "flex items-center justify-center gap-3 p-5 text-left" : "p-8 text-center"}`}>
      {icon ? (
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#087f6f]">
          {icon}
        </span>
      ) : null}
      <div>
        <h2 className={compact ? "text-sm font-extrabold text-[var(--splity-ink)]" : "text-lg font-semibold text-zinc-950"}>{title}</h2>
        <p className={`${compact ? "mt-0.5" : "mx-auto mt-2 max-w-md"} text-sm leading-6 text-[var(--splity-muted)]`}>
          {description}
        </p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
