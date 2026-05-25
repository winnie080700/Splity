"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { resendVerificationAction, type SettingsActionState } from "./actions";

type EmailSectionProps = {
  email: string;
  isVerified: boolean;
};

const initialState: SettingsActionState = { error: null, success: null };
const COOLDOWN_SECONDS = 60;

function SubmitButton({ cooldown }: { cooldown: number }) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  const disabled = pending || cooldown > 0;

  return (
    <Button disabled={disabled} type="submit" variant="secondary">
      {pending
        ? t("common.sending")
        : cooldown > 0
          ? t("settings.resendIn").replace("{seconds}", String(cooldown))
          : t("settings.resendVerification")}
    </Button>
  );
}

export function EmailSection({ email, isVerified }: EmailSectionProps) {
  const [state, formAction] = useActionState(resendVerificationAction, initialState);
  const [cooldown, setCooldown] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    if (!state.success || isVerified) return;
    setCooldown(COOLDOWN_SECONDS);
  }, [isVerified, state.success]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  return (
    <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">{t("settings.emailTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{email}</p>
        </div>
        <span
          className={[
            "rounded-full border px-3 py-1 text-xs font-semibold uppercase",
            isVerified
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-800",
          ].join(" ")}
        >
          {isVerified ? t("settings.emailVerified") : t("settings.emailPending")}
        </span>
      </div>
      {!isVerified ? (
        <form action={formAction} className="grid gap-3">
          <Alert tone="error">{state.error}</Alert>
          <Alert tone="success">{state.success}</Alert>
          <div>
            <SubmitButton cooldown={cooldown} />
          </div>
        </form>
      ) : null}
    </section>
  );
}
