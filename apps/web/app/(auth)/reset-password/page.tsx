"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/brand-mark";
import { Alert } from "@/components/ui/alert";
import { useTranslation } from "@/lib/i18n";
import { resetPassword, type PasswordActionState } from "../auth-actions";
import { AuthField, AuthSubmitButton } from "../auth-form-controls";
import { LockIcon } from "lucide-react";

const initialState: PasswordActionState = { error: null, success: null };

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, formAction] = useActionState(resetPassword, initialState);
  const { t } = useTranslation();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (!state.success) return;

    toast.success(state.success, { duration: 2000 });
    const timeout = window.setTimeout(() => {
      router.replace("/sign-in");
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [router, state.error, state.success]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(900px_480px_at_6%_0%,#fbe9c7_0%,transparent_55%),radial-gradient(760px_420px_at_100%_10%,#e0e6ff_0%,transparent_50%),var(--splity-bg)] px-4 py-8 text-[var(--splity-ink)]">
      <section className="w-full max-w-[480px] rounded-[28px] border border-[var(--splity-line)] bg-white px-6 py-7 shadow-[0_0_0_1px_rgba(12,21,56,0.02),0_28px_60px_rgba(12,21,56,0.10),0_56px_100px_rgba(12,21,56,0.06)] sm:px-8">
        <Link href="/" aria-label="Splity home">
          <BrandMark />
        </Link>

        <div className="mt-8 grid gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#faefce] text-[var(--splity-navy)]">
            <LockIcon />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
              {t("auth.accountRecovery")}
            </p>
            <h1 className="mt-1 splity-display text-[clamp(2.4rem,6vw,3.15rem)] leading-[1.02] tracking-tight">
              {t("auth.setNewPasswordTitle")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--splity-muted)]">
              {t("auth.setNewPassword")}
            </p>
          </div>
        </div>

        <form action={formAction} className="mt-6 grid gap-4">
          <Alert tone="error">{state.error}</Alert>
          <AuthField
            autoComplete="new-password"
            label={t("auth.newPassword")}
            minLength={6}
            name="password"
            placeholder={t("auth.passwordMinPlaceholder")}
            type="password"
          />
          <AuthField
            autoComplete="new-password"
            label={t("auth.confirmNewPassword")}
            minLength={6}
            name="confirmPassword"
            placeholder={t("auth.reenterPassword")}
            type="password"
          />
          <AuthSubmitButton
            idleLabel={t("auth.updatePassword")}
            pendingLabel={t("auth.updatingPassword")}
          />
        </form>

        <div className="mt-5 border-t border-dashed border-[var(--splity-line)] pt-4 text-right">
          <Link
            className="text-sm font-semibold text-[var(--splity-navy)] underline decoration-[var(--splity-gold)] underline-offset-4"
            href="/sign-in"
          >
            {t("auth.backToLogin")}
          </Link>
        </div>
      </section>
    </main>
  );
}
