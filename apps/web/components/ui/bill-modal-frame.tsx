import Link from "next/link";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { T } from "../i18n/t";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";

export function BillModalFrame({
  children,
  closeHref,
  description,
  title,
  width = "wide",
}: {
  children: ReactNode;
  closeHref: string;
  description?: ReactNode;
  title: ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <Dialog open>
      <DialogContent
        className={[
          "p-4 sm:p-6",
          width === "narrow" ? "max-w-3xl" : "max-w-7xl lg:!overflow-y-hidden",
        ].join(" ")}
        showClose={false}
      >
        <DialogHeader className="mb-5 items-start justify-between gap-4 border-b border-[var(--splity-line)] pb-4 pr-0" layout="row">
          <div>
            <DialogTitle className="mt-1 text-2xl font-extrabold sm:text-3xl">
              {title}
            </DialogTitle>
            {description ? (
              <p className="mt-1 text-sm font-semibold text-[var(--splity-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <Link
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/45 text-[var(--splity-muted)] transition hover:border-[#087f6f] hover:bg-emerald-50 hover:text-[#087f6f]"
            href={closeHref}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">
              <T k="common.close" />
            </span>
          </Link>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function BillAlertDialogFrame({
  children,
  closeHref,
  title,
}: {
  children: ReactNode;
  closeHref: string;
  title: ReactNode;
}) {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader className="grid-cols-[1fr_auto] items-start gap-4">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <Link
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--splity-line)] text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
            href={closeHref}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">
              <T k="common.close" />
            </span>
          </Link>
        </AlertDialogHeader>
        <div className="mt-3">{children}</div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
