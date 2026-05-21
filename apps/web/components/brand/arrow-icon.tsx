/**
 * Right-arrow SVG used in CTAs (e.g. "Get started →", "Continue →").
 *
 * Caller controls size + animation via className. Defaults to 14px (h-3.5).
 */

type Props = {
  /** Tailwind size + animation classes. Default "h-3.5 w-3.5". */
  className?: string;
};

export function ArrowIcon({ className = "h-3.5 w-3.5" }: Props) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
