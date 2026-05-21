import Link from "next/link";

/**
 * Top-of-page navigation back to Splity home.
 * Used on legal pages (privacy, terms), FAQ, and any standalone marketing
 * page that needs an unobtrusive "exit" affordance.
 */

type Props = {
  /** Override the destination. Default "/". */
  href?: string;
  /** Override the label. Default "Back to Splity". */
  label?: string;
  /** Extra className. */
  className?: string;
};

export function BackToHome({
  href = "/",
  label = "Back to Splity",
  className = "",
}: Props) {
  return (
    <Link
      className={`inline-flex items-center text-sm font-semibold text-[var(--splity-navy)] hover:underline ${className}`}
      href={href}
    >
      <span aria-hidden="true" className="mr-1">
        ←
      </span>
      {label}
    </Link>
  );
}
