"use client";

import { Check } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
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
    <section>
      <div className="grid min-h-[76px] gap-3 px-5 py-4 sm:grid-cols-[minmax(180px,0.28fr)_1fr_auto] sm:items-center sm:px-7">
        <div>
          <p className="text-sm font-extrabold text-[var(--splity-ink)]">
            {t("settings.emailAddress")}
          </p>
          <p className="mt-1 text-xs text-[var(--splity-muted)]">{t("settings.emailAddressHint")}</p>
        </div>
        <p className="min-w-0 break-all text-sm font-extrabold text-[var(--splity-ink)]">{email}</p>
        <span
          className={[
            "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold",
            isVerified
              ? "bg-emerald-50 text-[#087f6f]"
              : "bg-amber-50 text-amber-800",
          ].join(" ")}
        >
          {isVerified ? <Check className="h-3.5 w-3.5" /> : null}
          {isVerified ? t("settings.emailVerified") : t("settings.emailPending")}
        </span>
      </div>
      {!isVerified ? (
        <form action={formAction} className="grid gap-3 border-t border-dashed border-[var(--splity-line)] px-5 py-4 sm:px-7">
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
