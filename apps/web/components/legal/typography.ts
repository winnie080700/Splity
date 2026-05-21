/**
 * Shared typography tokens for legal pages (privacy, terms).
 *
 * Keeping these centralized ensures the two pages stay visually identical;
 * adjusting spacing or text color happens in one place.
 */

export const LEGAL_TYPOGRAPHY = {
  /** Top-level section wrapper. Adds breathing room between numbered sections. */
  section: "mt-12 first:mt-10",
  /** Numbered section heading, e.g. "1. Information We Collect". */
  h2: "text-2xl font-semibold tracking-tight text-[var(--splity-ink)]",
  /** Subsection heading, e.g. "1.1 Account Information". */
  h3: "mt-8 text-lg font-semibold text-[var(--splity-ink)]",
  /** Body paragraph. */
  p: "mt-4 text-base leading-relaxed text-[var(--splity-ink)]",
  /** Unordered list. */
  ul: "mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed text-[var(--splity-ink)]",
  /** Muted helper text, e.g. "Last updated …". */
  muted: "text-[var(--splity-muted)]",
  /** Inline link (mailto, external, etc). */
  link: "font-medium text-[var(--splity-navy)] underline underline-offset-2",
} as const;
