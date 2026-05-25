"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import {
  resendVerification,
  type ResendVerificationState,
} from "./actions";

const initialState: ResendVerificationState = {
  error: null,
  success: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();

  return (
    <Button disabled={pending} type="submit" variant="secondary">
      {pending ? t("common.sending") : t("auth.resendEmail")}
    </Button>
  );
}

export function VerifyEmailForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(resendVerification, initialState);
  const { t } = useTranslation();

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.checkEmailTitle")}</h1>
        <p className="text-sm leading-6 text-zinc-600">
          {t("auth.checkEmailBody")}
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <Alert tone="error">{state.error}</Alert>
        <Alert tone="success">{state.success}</Alert>
        <Input
          autoCapitalize="none"
          autoComplete="email"
          defaultValue={email}
          label={t("auth.email")}
          name="email"
          required
          type="email"
        />
        <SubmitButton />
      </form>

      <p className="text-center text-sm text-zinc-600">
        {t("auth.alreadyVerified")}{" "}
        <Link className="font-semibold text-zinc-950 underline" href="/sign-in">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
