"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { changePasswordAction, type SettingsActionState } from "./actions";

const initialState: SettingsActionState = { error: null, success: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();

  return (
    <Button disabled={pending} type="submit">
      {pending ? t("settings.updating") : t("settings.passwordTitle")}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialState);
  const { t } = useTranslation();

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950">{t("settings.passwordTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {t("settings.passwordBody")}
        </p>
      </div>
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
    </form>
  );
}
