"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";

import { useTranslation } from "@/lib/i18n";

export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  children,
  className,
  showClose = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  const { t } = useTranslation();

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(12,21,56,0.36)] backdrop-blur-sm splity-modal-backdrop" />
      <DialogPrimitive.Content
        className={[
          "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1rem)] min-w-0 -translate-x-1/2 -translate-y-1/2 overflow-x-hidden overflow-y-auto rounded-2xl border border-[var(--splity-line)] bg-white p-4 shadow-[0_12px_36px_rgba(12,21,56,0.22)] splity-modal-panel sm:w-[calc(100%-2rem)] sm:p-6",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            aria-label={t("common.close")}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({
  className,
  layout = "stack",
  ...props
}: HTMLAttributes<HTMLDivElement> & { layout?: "row" | "stack" }) {
  return (
    <div
      className={[
        layout === "row" ? "flex flex-row" : "grid",
        "gap-1.5 pr-12",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["flex flex-wrap justify-end gap-2", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={["splity-display text-2xl font-bold text-[var(--splity-ink)]", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={["text-sm leading-6 text-[var(--splity-muted)]", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
