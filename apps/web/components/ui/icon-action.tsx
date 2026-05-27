import Link from "next/link";
import { ReactNode } from "react";

export function IconAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: ReactNode;
}) {
  return (
    <Link
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-white text-[var(--splity-ink)] transition hover:bg-[var(--splity-bg)]"
      href={href}>
      {icon}
      <span className="sr-only">{label}</span>
    </Link>
  );
}
