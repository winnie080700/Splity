import Link from "next/link";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { T } from "../i18n/t";

export function BillModalFrame({
  children,
  closeHref,
  kicker,
  title,
  width = "wide",
}: {
  children: ReactNode;
  closeHref: string;
  kicker: ReactNode;
  title: ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(12,21,56,0.36)] px-4 py-6 backdrop-blur-sm splity-modal-backdrop">
      <div
        className={[
          "mx-auto w-full rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_28px_100px_rgba(12,21,56,0.32)] splity-modal-panel sm:p-6",
          width === "narrow" ? "max-w-3xl" : "max-w-7xl",
        ].join(" ")}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--splity-line)] pb-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
              {kicker}
            </p>
            <h2 className="splity-display mt-1 text-3xl font-extrabold text-[var(--splity-ink)]">
              {title}
            </h2>
          </div>
          <Link
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/45 text-[var(--splity-muted)] transition hover:bg-white hover:text-[var(--splity-ink)]"
            href={closeHref}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">
              <T k="common.close" />
            </span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
