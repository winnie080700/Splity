"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/brand-mark";
import { Alert } from "@/components/ui/alert";
import { resetPassword, type PasswordActionState } from "../auth-actions";
import { AuthField, AuthSubmitButton } from "../auth-form-controls";

const initialState: PasswordActionState = { error: null, success: null };

function LockIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, formAction] = useActionState(resetPassword, initialState);

  useEffect(() => {
    if (!state.success) return;

    toast.success(state.success, { duration: 3000 });
    const timeout = window.setTimeout(() => {
      router.replace("/sign-in");
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [router, state.success]);

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
              Account recovery
            </p>
            <h1 className="mt-1 font-[var(--splity-display)] text-[clamp(2.4rem,6vw,3.15rem)] font-bold leading-[1.02] tracking-tight">
              Set new password
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--splity-muted)]">
              Choose a new password for your Splity account. After updating, we
              will send you back to the login page.
            </p>
          </div>
        </div>

        <form action={formAction} className="mt-6 grid gap-4">
          <Alert tone="error">{state.error}</Alert>
          <AuthField
            autoComplete="new-password"
            label="New password"
            minLength={6}
            name="password"
            placeholder="At least 6 characters"
            type="password"
          />
          <AuthField
            autoComplete="new-password"
            label="Confirm new password"
            minLength={6}
            name="confirmPassword"
            placeholder="Re-enter your password"
            type="password"
          />
          <AuthSubmitButton
            idleLabel="Update password"
            pendingLabel="Updating password..."
          />
        </form>

        <div className="mt-5 border-t border-dashed border-[var(--splity-line)] pt-4 text-right">
          <Link
            className="text-sm font-semibold text-[var(--splity-navy)] underline decoration-[var(--splity-gold)] underline-offset-4"
            href="/sign-in"
          >
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
