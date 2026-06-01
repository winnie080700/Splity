"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type { ComponentProps, HTMLAttributes } from "react";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(12,21,56,0.36)] backdrop-blur-sm splity-modal-backdrop" />
      <AlertDialogPrimitive.Content
        className={[
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] min-w-0 max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-x-hidden rounded-2xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_12px_36px_rgba(12,21,56,0.22)] splity-modal-panel",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["grid gap-2", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function AlertDialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["mt-5 flex flex-wrap justify-end gap-2", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={["splity-display text-2xl font-bold text-[var(--splity-ink)]", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={["text-sm leading-6 text-[var(--splity-muted)]", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
