"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { useTranslation } from "@/lib/i18n";
import { resendVerificationAction, type SettingsActionState } from "./actions";

type EmailSectionProps = {
  email: string;
  isVerified: boolean;
};

const initialState: SettingsActionState = { error: null, success: null };
const COOLDOWN_SECONDS = 60;

function SubmitButton({ cooldown }: { cooldown: number }) {
  const { t } = useTranslation();
  const disabled = cooldown > 0;

  return (
    <PendingActionButton className="rounded-full" disabled={disabled} pendingLabel={t("common.sending")} pendingToastKey="common.sending" type="submit" variant="secondary">
      {cooldown > 0
          ? t("settings.resendIn").replace("{seconds}", String(cooldown))
          : t("settings.resendVerification")}
    </PendingActionButton>
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
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state.error, state.success]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  return (
    <section className="grid gap-3 rounded-xl border border-[var(--splity-line)] bg-[#fffefa] px-4 py-4">
      <div className="grid min-h-[42px] gap-3 sm:grid-cols-[minmax(150px,0.18fr)_1fr_auto] sm:items-center">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--splity-gold-strong)]">
            {t("settings.emailAddress")}
          </p>
          <p className="mt-1 text-xs text-[var(--splity-muted)]">{t("settings.emailAddressHint")}</p>
        </div>
        <p className="min-w-0 break-all text-sm font-bold text-[var(--splity-ink)]">{email}</p>
        <span
          className={[
            "inline-flex h-7 items-center rounded-full px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] before:mr-2 before:content-['•']",
            isVerified
              ? "bg-emerald-50 text-emerald-700 before:text-emerald-500"
              : "bg-amber-50 text-amber-800 before:text-amber-500",
          ].join(" ")}
        >
          {isVerified ? t("settings.emailVerified") : t("settings.emailPending")}
        </span>
      </div>
      {!isVerified ? (
        <form action={formAction} className="grid gap-3 border-t border-dashed border-[var(--splity-line)] pt-3">
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
