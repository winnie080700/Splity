/**
 * Splity brand logo — icon + wordmark.
 *
 * Use everywhere the Splity logo appears (landing, auth, settings, etc).
 * Do NOT inline this SVG/HTML elsewhere; changes here propagate globally.
 */

type Size = "sm" | "md" | "lg";

type Props = {
  /** Hide the "Splity" wordmark, show only the icon. Default false. */
  compact?: boolean;
  /** Visual size. Default "md" (matches landing/auth chrome). */
  size?: Size;
  /** Extra className applied to the outer wrapper. */
  className?: string;
};

const SIZE_STYLES: Record<Size, { wrapper: string; icon: string }> = {
  sm: {
    wrapper: "text-lg",
    icon: "h-6 w-6",
  },
  md: {
    wrapper: "text-[22px]",
    icon: "h-7 w-7",
  },
  lg: {
    wrapper: "text-2xl",
    icon: "h-9 w-9",
  },
};

export function BrandMark({ compact = false, size = "md", className = "" }: Props) {
  const styles = SIZE_STYLES[size];

  return (
    <span
      className={`inline-flex items-center gap-2.5 font-[var(--splity-display)] font-bold tracking-tight ${styles.wrapper} ${className}`}
    >
      <img
        alt=""
        aria-hidden="true"
        className={`shrink-0 ${styles.icon}`}
        src="/splity-logo.svg"
      />
      {compact ? null : <span>Splity</span>}
    </span>
  );
}
