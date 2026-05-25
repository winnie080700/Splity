"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { updateProfileAction, type SettingsActionState } from "./actions";

type ProfileFormProps = {
  name: string;
  username: string;
};

const initialState: SettingsActionState = { error: null, success: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();

  return (
    <Button disabled={pending} type="submit">
      {pending ? t("common.saving") : t("settings.saveProfile")}
    </Button>
  );
}

export function ProfileForm({ name, username }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);
  const { t } = useTranslation();

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950">{t("settings.profileTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {t("settings.profileBody")}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          autoComplete="name"
          defaultValue={name}
          label={t("settings.displayName")}
          maxLength={150}
          name="name"
          required
        />
        <Input
          autoComplete="username"
          defaultValue={username}
          hint={t("settings.usernameHint")}
          label={t("settings.username")}
          maxLength={30}
          minLength={3}
          name="username"
          pattern="[a-z0-9._-]{3,30}"
          required
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
