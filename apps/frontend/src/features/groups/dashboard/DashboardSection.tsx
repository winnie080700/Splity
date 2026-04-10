import type { ReactNode } from "react";
import { Link } from "react-router-dom";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type DashboardCardAction = {
  label: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary";
};

function renderDashboardAction(action: DashboardCardAction | undefined) {
  if (!action) {
    return null;
  }

  const className = cn(
    "dashboard-card-action",
    action.tone === "primary" ? "dashboard-card-action-primary" : "dashboard-card-action-secondary",
    action.disabled && "dashboard-card-action-disabled"
  );

  if (action.to && !action.disabled) {
    return (
      <Link className={className} to={action.to}>
        {action.label}
      </Link>
    );
  }

  if (action.onClick && !action.disabled) {
    return (
      <button className={className} onClick={action.onClick} type="button">
        {action.label}
      </button>
    );
  }

  return (
    <div className={className} aria-disabled={action.disabled}>
      {action.label}
    </div>
  );
}

export function DashboardSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  id
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("dashboard-surface p-6 md:p-7", className)}>
      <div className="dashboard-section-header">
        <div className="min-w-0">
          {eyebrow ? <div className="dashboard-section-eyebrow">{eyebrow}</div> : null}
          <h2 className="dashboard-section-title">{title}</h2>
          {description ? <p className="dashboard-section-copy">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={cn("mt-6", contentClassName)}>{children}</div>
    </section>
  );
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  iconClassName
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconClassName?: string;
}) {
  return (
    <article className="dashboard-metric-card">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f8873]">{label}</div>
          <div className="mt-4 text-[2.55rem] font-semibold tracking-[-0.05em] text-[#1a1813]">{value}</div>
        </div>

        <span className={cn("dashboard-metric-icon", iconClassName)}>{icon}</span>
      </div>
    </article>
  );
}

export function DashboardFinancialCard({
  label,
  value,
  icon,
  support,
  actionLabel,
  to,
  tone = "neutral",
  badge,
  disabled = false
}: {
  label: string;
  value: string;
  icon: ReactNode;
  support?: string;
  actionLabel?: string;
  to?: string;
  tone?: "neutral" | "positive" | "negative" | "brand";
  badge?: string;
  disabled?: boolean;
}) {
  const className = cn(
    "dashboard-financial-card",
    tone === "positive" && "dashboard-financial-card-positive",
    tone === "negative" && "dashboard-financial-card-negative",
    tone === "brand" && "dashboard-financial-card-brand",
    disabled && "dashboard-financial-card-disabled"
  );

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="dashboard-financial-label">{label}</div>
          <div className="dashboard-financial-value">{value}</div>
        </div>

        <span className="dashboard-financial-icon">{icon}</span>
      </div>

      {support || actionLabel || badge ? (
        <div className="mt-6 flex items-end justify-between gap-3">
          <div className="min-w-0 space-y-2">
            {support ? <p className="dashboard-financial-support">{support}</p> : null}
            {actionLabel ? <span className="dashboard-financial-action">{actionLabel}</span> : null}
          </div>

          {badge ? <span className="dashboard-financial-badge">{badge}</span> : null}
        </div>
      ) : null}
    </>
  );

  if (to && !disabled) {
    return (
      <Link className={className} to={to}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} aria-disabled={disabled}>
      {content}
    </div>
  );
}

export function DashboardQuickAction({
  label,
  description,
  icon,
  to,
  onClick,
  disabled = false
}: {
  label: string;
  description?: string;
  icon: ReactNode;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = cn("dashboard-quick-action-card", disabled && "dashboard-quick-action-card-disabled");

  const content = (
    <>
      <span className="dashboard-quick-action-icon">{icon}</span>
      <div className="min-w-0">
        <div className="dashboard-quick-action-label">{label}</div>
        {description ? <p className="dashboard-quick-action-copy">{description}</p> : null}
      </div>
    </>
  );

  if (to && !disabled) {
    return (
      <Link className={className} to={to}>
        {content}
      </Link>
    );
  }

  if (onClick && !disabled) {
    return (
      <button className={className} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className={className} aria-disabled={disabled}>
      {content}
    </div>
  );
}

export function DashboardSignalPill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warning" | "positive" | "brand";
}) {
  return (
    <span
      className={cn(
        "dashboard-signal-pill",
        tone === "warning" && "dashboard-signal-pill-warning",
        tone === "positive" && "dashboard-signal-pill-positive",
        tone === "brand" && "dashboard-signal-pill-brand"
      )}
    >
      {label}
    </span>
  );
}

export function DashboardAttentionCard({
  eyebrow,
  title,
  description,
  value,
  valueLabel,
  icon,
  badge,
  badgeTone = "warning",
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  value: string;
  valueLabel: string;
  icon: ReactNode;
  badge?: string;
  badgeTone?: "neutral" | "warning" | "positive" | "brand";
  action?: DashboardCardAction;
}) {
  return (
    <article className="dashboard-attention-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="dashboard-attention-icon">{icon}</span>
          <div className="min-w-0">
            <div className="dashboard-context-kicker">{eyebrow}</div>
            <h3 className="dashboard-context-title">{title}</h3>
          </div>
        </div>

        {badge ? <DashboardSignalPill label={badge} tone={badgeTone} /> : null}
      </div>

      <p className="dashboard-context-description">{description}</p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="dashboard-context-value">{value}</div>
          <div className="dashboard-context-value-label">{valueLabel}</div>
        </div>

        {renderDashboardAction(action)}
      </div>
    </article>
  );
}

export function DashboardContextCard({
  eyebrow,
  title,
  subtitle,
  description,
  value,
  valueLabel,
  icon,
  badge,
  meta,
  primaryAction,
  secondaryAction
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  value: string;
  valueLabel: string;
  icon: ReactNode;
  badge?: ReactNode;
  meta: Array<{
    label: string;
    value: string;
  }>;
  primaryAction?: DashboardCardAction;
  secondaryAction?: DashboardCardAction;
}) {
  return (
    <article className="dashboard-context-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="dashboard-context-icon">{icon}</span>
          <div className="min-w-0">
            {eyebrow ? <div className="dashboard-context-kicker">{eyebrow}</div> : null}
            <h3 className="dashboard-context-title">{title}</h3>
            {subtitle ? <p className="dashboard-context-subtitle">{subtitle}</p> : null}
          </div>
        </div>

        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      {description ? <p className="dashboard-context-description">{description}</p> : null}

      <div className="mt-6">
        <div className="dashboard-context-value">{value}</div>
        <div className="dashboard-context-value-label">{valueLabel}</div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {meta.map((item) => (
          <div key={`${item.label}:${item.value}`} className="dashboard-context-meta">
            <div className="dashboard-context-meta-label">{item.label}</div>
            <div className="dashboard-context-meta-value">{item.value}</div>
          </div>
        ))}
      </div>

      {primaryAction || secondaryAction ? (
        <div className="dashboard-card-actions">
          {renderDashboardAction(primaryAction)}
          {renderDashboardAction(secondaryAction)}
        </div>
      ) : null}
    </article>
  );
}

export function DashboardInsightCard({
  label,
  value,
  detail,
  icon
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <article className="dashboard-insight-card">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="dashboard-insight-label">{label}</div>
          <div className="dashboard-insight-value">{value}</div>
        </div>

        <span className="dashboard-insight-icon">{icon}</span>
      </div>

      <p className="dashboard-insight-detail">{detail}</p>
    </article>
  );
}

export function DashboardActivityItem({
  title,
  description,
  meta,
  icon,
  to,
  badge
}: {
  title: string;
  description: string;
  meta: string;
  icon: ReactNode;
  to?: string;
  badge?: ReactNode;
}) {
  const content = (
    <>
      <span className="dashboard-activity-icon">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="dashboard-activity-title">{title}</h3>
            <p className="dashboard-activity-description">{description}</p>
          </div>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
        <div className="dashboard-activity-meta">{meta}</div>
      </div>
    </>
  );

  if (to) {
    return (
      <Link className="dashboard-activity-item" to={to}>
        {content}
      </Link>
    );
  }

  return <article className="dashboard-activity-item">{content}</article>;
}
