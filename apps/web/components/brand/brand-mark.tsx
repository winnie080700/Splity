/**
 * Splity brand logo — the "S" tile + wordmark.
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

const SIZE_STYLES: Record<Size, { wrapper: string; tile: string; letter: string }> = {
  sm: {
    wrapper: "text-lg",
    tile: "h-6 w-6 text-sm",
    letter: "text-sm",
  },
  md: {
    wrapper: "text-[22px]",
    tile: "h-7 w-7",
    letter: "text-lg",
  },
  lg: {
    wrapper: "text-2xl",
    tile: "h-9 w-9",
    letter: "text-xl",
  },
};

export function BrandMark({ compact = false, size = "md", className = "" }: Props) {
  const styles = SIZE_STYLES[size];

  return (
    <span
      className={`inline-flex items-center gap-2.5 font-[var(--splity-display)] font-bold tracking-tight ${styles.wrapper} ${className}`}
    >
      <span
        className={`grid -rotate-3 place-items-center rounded-lg bg-[var(--splity-navy)] font-extrabold text-[var(--splity-gold)] ${styles.tile} ${styles.letter}`}
        aria-hidden="true"
      >
        S
      </span>
      {compact ? null : <span>Splity</span>}
    </span>
  );
}
