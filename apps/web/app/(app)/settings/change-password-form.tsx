"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { useTranslation } from "@/lib/i18n";
import { changePasswordAction, type SettingsActionState } from "./actions";

const initialState: SettingsActionState = { error: null, success: null };

function PasswordField({
  autoComplete,
  hint,
  label,
  minLength,
  name,
}: {
  autoComplete: string;
  hint?: string;
  label: string;
  minLength?: number;
  name: string;
}) {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  return (
    <label className="grid gap-2">
      <span className="text-sm font-extrabold text-[var(--splity-ink)]">
        {label}
      </span>
      <span className="relative block">
        <input
          autoComplete={autoComplete}
          className="h-11 w-full rounded-xl border border-[var(--splity-line-strong)] bg-white px-3.5 pr-12 text-sm font-semibold text-[var(--splity-ink)] outline-none transition placeholder:text-[var(--splity-muted)] focus:border-[#087f6f] focus:ring-4 focus:ring-[rgba(8,127,111,0.12)]"
          minLength={minLength}
          name={name}
          required
          type={visible ? "text" : "password"}
        />
        <button
          aria-label={visible ? t("settings.hidePassword") : t("settings.showPassword")}
          className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
          onClick={() => setVisible((value) => !value)}
          type="button"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
      <span
        aria-hidden={hint ? undefined : true}
        className="min-h-5 text-xs leading-5 text-[var(--splity-muted)]"
      >
        {hint}
      </span>
    </label>
  );
}

function SubmitButton() {
  const { t } = useTranslation();

  return (
    <PendingActionButton
      className="h-11 gap-2 rounded-xl bg-[var(--splity-ink)] px-6 text-sm hover:bg-[#111a3d]"
      pendingLabel={t("settings.updating")}
      type="submit"
    >
      {t("settings.updatePassword")}
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
    <Dialog>
      <div className="grid min-h-[76px] gap-3 px-5 py-4 sm:grid-cols-[minmax(180px,0.28fr)_1fr_auto] sm:items-center sm:px-7">
        <div>
          <p className="text-sm font-extrabold text-[var(--splity-ink)]">
            {t("settings.passwordLabel")}
          </p>
          <p className="mt-1 text-xs text-[var(--splity-muted)]">{t("settings.passwordLastChanged")}</p>
        </div>
        <p className="text-sm font-extrabold tracking-[0.35em] text-[var(--splity-ink)]">••••••••••</p>
        <DialogTrigger asChild>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-[#087f6f] transition hover:border-[#087f6f] hover:bg-emerald-50 sm:justify-self-end"
            type="button"
          >
            <LockKeyhole className="h-4 w-4" />
            {t("settings.passwordTitle")}
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-2xl overflow-hidden rounded-3xl p-0 sm:p-0">
        <form action={formAction}>
          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <DialogHeader className="gap-2 pr-14">
              <DialogTitle className="text-2xl font-extrabold sm:text-3xl">
                {t("settings.passwordTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 sm:text-base">
                {t("settings.passwordBody")}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-5">
              <PasswordField
                autoComplete="current-password"
                label={t("settings.currentPassword")}
                name="currentPassword"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <PasswordField
                  autoComplete="new-password"
                  hint={t("settings.passwordRequirement")}
                  label={t("settings.newPassword")}
                  minLength={6}
                  name="newPassword"
                />
                <PasswordField
                  autoComplete="new-password"
                  label={t("settings.confirmNewPassword")}
                  minLength={6}
                  name="confirmNewPassword"
                />
              </div>
            </div>

            <div className="mt-4">
              <Alert tone="error">{state.error}</Alert>
              <Alert tone="success">{state.success}</Alert>
            </div>
          </div>

          <DialogFooter className="border-t border-[var(--splity-line)] px-5 py-4 sm:px-7">
            <DialogClose asChild>
              <button
                className="inline-flex h-11 cursor-pointer items-center rounded-xl px-5 text-sm font-extrabold text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
                type="button"
              >
                {t("common.cancel")}
              </button>
            </DialogClose>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
