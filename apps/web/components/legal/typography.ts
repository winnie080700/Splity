/**
 * Shared typography tokens for legal pages (privacy, terms).
 *
 * Keeping these centralized ensures the two pages stay visually identical;
 * adjusting spacing or text color happens in one place.
 */

export const LEGAL_TYPOGRAPHY = {
  /** Top-level section wrapper. Adds breathing room between numbered sections. */
  section: "mt-8 first:mt-7 sm:mt-12 sm:first:mt-10",
  /** Numbered section heading, e.g. "1. Information We Collect". */
  h2: "text-xl font-semibold tracking-tight text-[var(--splity-ink)] sm:text-2xl",
  /** Subsection heading, e.g. "1.1 Account Information". */
  h3: "mt-6 text-base font-semibold text-[var(--splity-ink)] sm:mt-8 sm:text-lg",
  /** Body paragraph. */
  p: "mt-3 text-sm leading-6 text-[var(--splity-ink)] sm:mt-4 sm:text-base sm:leading-relaxed",
  /** Unordered list. */
  ul: "mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-6 text-[var(--splity-ink)] sm:mt-4 sm:gap-2 sm:pl-6 sm:text-base sm:leading-relaxed",
  /** Muted helper text, e.g. "Last updated …". */
  muted: "text-[var(--splity-muted)]",
  /** Inline link (mailto, external, etc). */
  link: "font-medium text-[var(--splity-navy)] underline underline-offset-2",
} as const;
