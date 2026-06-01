"use client";

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { useTranslation, type MessageKey } from "@/lib/i18n";
import { Button } from "./button";
import { Spinner } from "./spinner";

type PendingActionButtonProps = Omit<ComponentProps<typeof Button>, "children"> & {
  children: ReactNode;
  pendingLabel?: ReactNode;
  pendingToastKey?: MessageKey;
};

export function PendingActionButton({
  children,
  className,
  disabled,
  pendingLabel,
  pendingToastKey = "common.saving",
  ...props
}: PendingActionButtonProps) {
  const { pending } = useFormStatus();
  const toastId = useRef<string | number | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (pending && toastId.current === null) {
      toastId.current = toast.loading(t(pendingToastKey));
    }

    if (!pending && toastId.current !== null) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }

    return () => {
      if (toastId.current !== null) toast.dismiss(toastId.current);
    };
  }, [pending, pendingToastKey, t]);

  return (
    <Button className={["gap-2", className].filter(Boolean).join(" ")} disabled={disabled || pending} {...props}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? t(pendingToastKey)}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
