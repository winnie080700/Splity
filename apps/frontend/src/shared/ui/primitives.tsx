import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div className="max-w-2xl space-y-3">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <div className="space-y-2">
          <h1 className="page-title">{title}</h1>
          {description ? <p className="section-copy max-w-2xl">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">{actions}</div> : null}
    </div>
  );
}

export function SectionCard({
  children,
  className,
  id
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return <section id={id} className={cn("card p-5 md:p-6", className)}>{children}</section>;
}

export function StatTile({
  label,
  value,
  icon,
  tone = "default",
  className
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "brand" | "success" | "warning";
  className?: string;
}) {
  const toneClasses = {
    default: "bg-white text-ink",
    brand: "bg-brand/5 text-ink",
    success: "bg-mint/60 text-ink",
    warning: "bg-amber/70 text-ink"
  }[tone];

  return (
    <div className={cn("stat-card", toneClasses, className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">{label}</div>
          <div className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
        </div>
        {icon ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white text-brand">
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon ? (
        <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white text-brand">
          {icon}
        </span>
      ) : null}
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function InlineMessage({
  tone = "info",
  title,
  children,
  action
}: {
  tone?: "info" | "error" | "success";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const toneClasses = {
    info: "border-sky bg-sky/50 text-ink",
    error: "border-rose-200 bg-rose-50 text-danger",
    success: "border-mint bg-mint/60 text-success"
  }[tone];

  return (
    <div className={cn("rounded-[20px] border px-4 py-3", toneClasses)}>
      {title ? <div className="text-sm font-semibold">{title}</div> : null}
      <div className={cn("text-sm leading-6", title ? "mt-1" : null)}>{children}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className
      )}
      aria-hidden="true"
    />
  );
}

export function LoadingState({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-[20px] border border-slate-200/80 bg-white/80"
        />
      ))}
    </div>
  );
}

type IconActionVariant = "primary" | "secondary";
type IconActionSize = "sm" | "md";

function getIconActionClassName(variant: IconActionVariant, size: IconActionSize, className?: string) {
  return cn(
    "icon-action",
    variant === "primary" ? "icon-action-primary" : "icon-action-secondary",
    size === "sm" ? "icon-action-sm" : "icon-action-md",
    className
  );
}

export function IconActionButton({
  label,
  icon,
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: {
  label: string;
  icon: ReactNode;
  variant?: IconActionVariant;
  size?: IconActionSize;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      title={label}
      className={getIconActionClassName(variant, size, className)}
      type={type}
      {...props}
    >
      {icon}
    </button>
  );
}

export function IconActionLink({
  label,
  icon,
  variant = "secondary",
  size = "md",
  className,
  ...props
}: {
  label: string;
  icon: ReactNode;
  variant?: IconActionVariant;
  size?: IconActionSize;
  className?: string;
} & LinkProps) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={getIconActionClassName(variant, size, className)}
      {...props}
    >
      {icon}
    </Link>
  );
}
