"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { changePasswordAction, type SettingsActionState } from "./actions";

const initialState: SettingsActionState = { error: null, success: null };

function SubmitButton() {
  const { t } = useTranslation();

  return (
    <PendingActionButton
      className="gap-2 rounded-full bg-[var(--splity-navy)] px-5 hover:bg-[#142258]"
      pendingLabel={t("settings.updating")}
      type="submit"
    >
      {t("settings.updatePassword")}
      <ArrowRight className="h-4 w-4" />
    </PendingActionButton>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialState);
  const { t } = useTranslation();

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state.error, state.success]);

  return (
    <form action={formAction} className="rounded-xl border border-[var(--splity-line)] bg-[#fffefa] px-4 py-4">
      <details className="group">
        <summary className="grid cursor-pointer list-none gap-3 sm:grid-cols-[minmax(150px,0.18fr)_1fr_auto] sm:items-center">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--splity-gold-strong)]">
              {t("settings.passwordLabel")}
            </p>
            <p className="mt-1 text-xs text-[var(--splity-muted)]">{t("settings.passwordLastChanged")}</p>
          </div>
          <p className="text-sm font-bold tracking-[0.35em] text-[var(--splity-ink)]">••••••••••</p>
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-[var(--splity-ink)] transition group-open:bg-[#f7f5ee] sm:justify-self-end">
            <LockKeyhole className="h-4 w-4 text-[var(--splity-muted)]" />
            {t("settings.passwordTitle")}
          </span>
        </summary>

        <div className="mt-4 grid gap-4 border-t border-dashed border-[var(--splity-line)] pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              autoComplete="current-password"
              label={t("settings.currentPassword")}
              name="currentPassword"
              required
              type="password"
            />
            <Input
              autoComplete="new-password"
              label={t("settings.newPassword")}
              minLength={6}
              name="newPassword"
              required
              type="password"
            />
            <Input
              autoComplete="new-password"
              label={t("settings.confirmNewPassword")}
              minLength={6}
              name="confirmNewPassword"
              required
              type="password"
            />
          </div>
          <Alert tone="error">{state.error}</Alert>
          <Alert tone="success">{state.success}</Alert>
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </div>
      </details>
    </form>
  );
}
