"use client";

import { useTranslation, type MessageKey } from "@/lib/i18n";

type TProps = {
  k: MessageKey;
  values?: Record<string, string | number>;
};

function interpolate(message: string, values?: Record<string, string | number>) {
  if (!values) return message;

  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    message
  );
}

export function T({ k, values }: TProps) {
  const { t } = useTranslation();
  return <>{interpolate(t(k), values)}</>;
}
