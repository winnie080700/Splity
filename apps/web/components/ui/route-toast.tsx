"use client";

import { toast } from "sonner";

import type { MessageKey } from "@/lib/i18n";

const routeSuccessStorageKey = "splity.route-success.key";

function storage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
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

  const successKey = sessionStorage.getItem(routeSuccessStorageKey) as MessageKey | null;
  if (successKey) {
    toast.success(t(successKey));
    sessionStorage.removeItem(routeSuccessStorageKey);
  }
}
