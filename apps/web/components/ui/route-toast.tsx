"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { toast } from "sonner";

import { useTranslation, type MessageKey } from "@/lib/i18n";

const routeLoadingToastId = "splity.route-loading";
const routeLoadingStorageKey = "splity.route-loading.active";
const routeSuccessStorageKey = "splity.route-success.key";

function storage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function showRouteLoading(message: string) {
  toast.loading(message, { id: routeLoadingToastId });
  storage()?.setItem(routeLoadingStorageKey, "1");
}

export function dismissRouteLoading() {
  toast.dismiss(routeLoadingToastId);
  storage()?.removeItem(routeLoadingStorageKey);
}

export function queueRouteSuccess(key: MessageKey) {
  storage()?.setItem(routeSuccessStorageKey, key);
}

export function clearRouteSuccess() {
  storage()?.removeItem(routeSuccessStorageKey);
}

export function consumeRouteToasts(t: (key: MessageKey) => string) {
  const sessionStorage = storage();
  if (!sessionStorage) return;

  if (sessionStorage.getItem(routeLoadingStorageKey)) {
    toast.dismiss(routeLoadingToastId);
    sessionStorage.removeItem(routeLoadingStorageKey);
  }

  const successKey = sessionStorage.getItem(routeSuccessStorageKey) as MessageKey | null;
  if (successKey) {
    toast.success(t(successKey));
    sessionStorage.removeItem(routeSuccessStorageKey);
  }
}

type LoadingLinkProps = ComponentProps<typeof Link> & {
  loadingKey?: MessageKey;
};

export function LoadingLink({
  loadingKey = "common.loading",
  onClick,
  ...props
}: LoadingLinkProps) {
  const { t } = useTranslation();

  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          showRouteLoading(t(loadingKey));
        }
      }}
    />
  );
}
