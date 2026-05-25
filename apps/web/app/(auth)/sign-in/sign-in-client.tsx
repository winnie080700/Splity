"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/brand-mark";
import { Alert } from "@/components/ui/alert";
import { useTranslation } from "@/lib/i18n";
import {
  requestPasswordReset,
  signIn,
  signUp,
  type AuthActionState,
  type PasswordActionState,
} from "../auth-actions";
import { AuthField, AuthSubmitButton } from "../auth-form-controls";
import { MoveLeft, SparklesIcon, XIcon } from "lucide-react";

type AuthMode = "login" | "register";
type SignInClientProps = {
  callbackError: string | null;
  initialMode: AuthMode;
};
type AuthCopy = {
  backHome: string;
  free: string;
  heroA: string;
  heroB: string;
  heroC: string;
  heroBody: string;
  receiptTitle: string;
  receiptStatus: string;
  receiptRows: [string, string, string][];
  receiptTotal: string;
  receiptStampA: string;
  receiptStampB: string;
  account: string;
  registerTitle: string;
  loginTitle: string;
  login: string;
  register: string;
  name: string;
  namePlaceholder: string;
  username: string;
  usernamePlaceholder: string;
  usernameHint: string;
  usernameOk: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  newPasswordPlaceholder: string;
  currentPasswordPlaceholder: string;
  createAccount: string;
  creatingAccount: string;
  logIn: string;
  loggingIn: string;
  forgotPassword: string;
  terms: string;
  privacy: string;
  footerLeft: string;
  footerRight: string;
  resetTitle: string;
  resetBody: string;
  resetSubmit: string;
  resetPending: string;
  close: string;
};

const signInInitialState: AuthActionState = {
  error: null,
  success: null,
  redirectTo: null,
};
const signUpInitialState: AuthActionState = {
  error: null,
  success: null,
  redirectTo: null,
};
const forgotPasswordInitialState: PasswordActionState = {
  error: null,
  success: null,
};
function ReceiptPreview({ text }: { text: AuthCopy }) {
  return (
    <div
      aria-hidden="true"
      className="relative mt-6 hidden max-w-[390px] -rotate-[1.4deg] rounded-[18px] border border-[var(--splity-line)] bg-white px-5 pb-4 pt-[18px] shadow-[0_24px_50px_rgba(12,21,56,0.08)] before:absolute before:-top-2.5 before:left-6 before:h-[18px] before:w-14 before:-rotate-6 before:rounded-[3px] before:border before:border-dashed before:border-[var(--splity-gold-strong)] before:bg-[#faefce] before:content-[''] md:block [@media(max-height:760px)]:hidden">
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="font-[var(--splity-display)] text-[15px]">
          {text.receiptTitle}
        </p>
        <p className="font-[var(--splity-mono)] text-[10.5px] uppercase tracking-wide text-[var(--splity-muted)]">
          {text.receiptStatus}
        </p>
      </div>
      {text.receiptRows.map(([label, who, value]) => (
        <div
          className="grid grid-cols-[1fr_auto] items-center border-b border-dashed border-[var(--splity-line)] py-1.5 text-[12.5px] last:border-b-0"
          key={label}>
          <span className="font-medium">
            {label}
            <span className="ml-1 text-[11px] font-normal text-[var(--splity-muted)]">
              {who}
            </span>
          </span>
          <span className="font-[var(--splity-mono)] text-[12.5px]">
            {value}
          </span>
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between border-t-2 border-[var(--splity-ink)] pt-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
          {text.receiptTotal}
        </span>
        <span className="font-[var(--splity-display)] text-xl text-[var(--splity-mint)]">
          +¥244.00
        </span>
      </div>
      <div className="absolute -bottom-3 -right-3 flex h-[72px] w-[72px] rotate-[8deg] flex-col items-center justify-center rounded-full border-2 border-dashed border-[rgba(27,42,107,0.25)] bg-[var(--splity-gold)] text-center font-[var(--splity-display)] text-[10px] uppercase leading-tight tracking-wider text-[var(--splity-navy)] shadow-[0_8px_18px_rgba(217,148,38,0.35)]">
        <span>{text.receiptStampA}</span>
        <span className="mt-[-2px] font-[var(--splity-serif)] text-xl italic tracking-tight">
          {text.receiptStampB}
        </span>
      </div>
    </div>
  );
}

function ForgotPasswordModal({
  isOpen,
  onClose,
  text,
}: {
  isOpen: boolean;
  onClose: () => void;
  text: AuthCopy;
}) {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    forgotPasswordInitialState,
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(12,21,56,0.45)] px-4 backdrop-blur-sm"
      role="presentation">
      <section
        aria-labelledby="forgot-password-title"
        aria-modal="true"
        className="w-full max-w-md rounded-[24px] border border-[var(--splity-line)] bg-white p-6 shadow-[0_30px_80px_rgba(12,21,56,0.25)]"
        role="dialog">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
              {text.account}
            </p>
            <h3
              className="mt-1 font-[var(--splity-display)] text-3xl tracking-tight"
              id="forgot-password-title">
              {text.resetTitle}
            </h3>
          </div>
          <button
            aria-label={text.close}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--splity-line)] text-xl leading-none text-[var(--splity-muted)] transition hover:bg-[#f2f1ec] hover:text-[var(--splity-ink)]"
            onClick={onClose}
            type="button">
            <XIcon aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--splity-muted)]">
          {text.resetBody}
        </p>
        <form action={formAction} className="mt-5 grid gap-4">
          <Alert tone="error">{state.error}</Alert>
          <Alert tone="success">{state.success}</Alert>
          <AuthField
            autoCapitalize="none"
            autoComplete="email"
            label={text.email}
            name="email"
            placeholder={text.emailPlaceholder}
            type="email"
          />
          <AuthSubmitButton
            idleLabel={text.resetSubmit}
            pendingLabel={text.resetPending}
          />
        </form>
      </section>
    </div>
  );
}

function useAuthCopy(): AuthCopy {
  const { t } = useTranslation();

  return {
    backHome: t("auth.backHome"),
    free: t("auth.free"),
    heroA: t("auth.heroA"),
    heroB: t("auth.heroB"),
    heroC: t("auth.heroC"),
    heroBody: t("auth.heroBody"),
    receiptTitle: t("auth.receiptTitle"),
    receiptStatus: t("auth.receiptStatus"),
    receiptRows: [
      [t("auth.receiptRow1Label"), t("auth.receiptRow1Who"), "¥856"],
      [t("auth.receiptRow2Label"), t("auth.receiptRow2Who"), "¥48"],
      [t("auth.receiptRow3Label"), t("auth.receiptRow3Who"), "¥72"],
    ],
    receiptTotal: t("auth.receiptTotal"),
    receiptStampA: t("auth.receiptStampA"),
    receiptStampB: t("auth.receiptStampB"),
    account: t("auth.account"),
    registerTitle: t("auth.registerTitle"),
    loginTitle: t("auth.loginTitle"),
    login: t("auth.login"),
    register: t("auth.register"),
    name: t("auth.name"),
    namePlaceholder: t("auth.namePlaceholder"),
    username: t("auth.username"),
    usernamePlaceholder: t("auth.usernamePlaceholder"),
    usernameHint: t("auth.usernameHint"),
    usernameOk: t("auth.usernameOk"),
    email: t("auth.email"),
    emailPlaceholder: t("auth.emailPlaceholder"),
    password: t("auth.password"),
    newPasswordPlaceholder: t("auth.passwordMinPlaceholder"),
    currentPasswordPlaceholder: t("auth.currentPasswordPlaceholder"),
    createAccount: t("auth.createAccount"),
    creatingAccount: t("auth.creatingAccount"),
    logIn: t("auth.logIn"),
    loggingIn: t("auth.loggingIn"),
    forgotPassword: t("auth.forgotPassword"),
    terms: t("auth.terms"),
    privacy: t("auth.privacy"),
    footerLeft: t("auth.footerLeft"),
    footerRight: t("auth.footerRight"),
    resetTitle: t("auth.resetTitle"),
    resetBody: t("auth.resetBody"),
    resetSubmit: t("auth.resetSubmit"),
    resetPending: t("auth.resetPending"),
    close: t("auth.close"),
  };
}

export function SignInClient({ callbackError, initialMode }: SignInClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [signInState, signInAction] = useActionState(signIn, signInInitialState);
  const [signUpState, signUpAction] = useActionState(signUp, signUpInitialState);
  const isRegister = mode === "register";
  const text = useAuthCopy();

  useEffect(() => {
    const success = signInState.success ?? signUpState.success;
    const next = signInState.redirectTo ?? signUpState.redirectTo;

    if (!success || !next) return;

    toast.success(success, { duration: 3000 });
    const timeout = window.setTimeout(() => {
      router.replace(next);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [
    router,
    signInState.redirectTo,
    signInState.success,
    signUpState.redirectTo,
    signUpState.success,
  ]);

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(1000px_520px_at_6%_0%,#fbe9c7_0%,transparent_55%),radial-gradient(850px_480px_at_100%_12%,#e0e6ff_0%,transparent_50%),var(--splity-bg)] text-[var(--splity-ink)] lg:h-dvh">
      <nav className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-10 lg:px-8 lg:py-3">
        <Link href="/" aria-label="Splity home">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--splity-ink)] opacity-80 transition hover:opacity-100"
            href="/"
          >
            <MoveLeft />
            {text.backHome}
          </Link>
        </div>
      </nav>

      <main className="mx-auto grid w-full max-w-[1220px] flex-1 items-center gap-8 px-5 pb-8 pt-3 sm:px-10 lg:min-h-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(410px,460px)] lg:gap-10 lg:px-8 lg:pb-4 lg:pt-1">
        <section className="max-w-[520px] lg:pr-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--splity-line)] bg-white py-1.5 pl-2 pr-3.5 text-xs font-semibold uppercase tracking-[0.06em] lg:mb-3">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--splity-gold)] font-[var(--splity-display)] text-[11px] text-[var(--splity-navy)]">
              <SparklesIcon aria-hidden="true" className="h-3 w-3" />
            </span>
            {text.free}
          </div>
          <h1 className="font-[var(--splity-display)] text-[clamp(2.9rem,5.2vw,4.35rem)] leading-[0.94] tracking-tight text-[var(--splity-ink)]">
            {text.heroA}
            <br />
            {text.heroB}
            <br />
            <span className="font-[var(--splity-serif)] italic text-[var(--splity-navy)]">
              {text.heroC}
            </span>
          </h1>
          <p className="mt-5 max-w-[450px] text-[15px] leading-6 text-[var(--splity-muted)] lg:mt-4">
            {text.heroBody}
          </p>
          <ReceiptPreview text={text} />
        </section>

        <section className="relative w-full max-w-[460px] justify-self-end rounded-[24px] border border-[var(--splity-line)] bg-white px-6 pb-6 pt-7 shadow-[0_0_0_1px_rgba(12,21,56,0.02),0_24px_50px_rgba(12,21,56,0.09),0_48px_90px_rgba(12,21,56,0.05)] sm:px-8 lg:max-h-[calc(100dvh-7rem)] lg:overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
            {text.account}
          </p>
          <h2 className="mb-4 mt-1 font-[var(--splity-display)] text-[clamp(2.15rem,3.6vw,2.7rem)] leading-[1.02] tracking-tight">
            {isRegister ? text.registerTitle : text.loginTitle}
          </h2>

          <div className="mb-5 grid grid-cols-2 rounded-full border border-[var(--splity-line)] bg-[#f2f1ec] p-1">
            <button
              aria-selected={!isRegister}
              className={[
                "rounded-full px-3.5 py-2 text-sm font-semibold transition",
                !isRegister
                  ? "bg-[var(--splity-navy)] text-white shadow-[0_6px_14px_rgba(27,42,107,0.22)]"
                  : "text-[var(--splity-muted)] hover:text-[var(--splity-ink)]",
              ].join(" ")}
              onClick={() => setMode("login")}
              role="tab"
              type="button"
            >
              {text.login}
            </button>
            <button
              aria-selected={isRegister}
              className={[
                "rounded-full px-3.5 py-2 text-sm font-semibold transition",
                isRegister
                  ? "bg-[var(--splity-navy)] text-white shadow-[0_6px_14px_rgba(27,42,107,0.22)]"
                  : "text-[var(--splity-muted)] hover:text-[var(--splity-ink)]",
              ].join(" ")}
              onClick={() => setMode("register")}
              role="tab"
              type="button"
            >
              {text.register}
            </button>
          </div>

          {isRegister ? (
            <form action={signUpAction} className="grid gap-3">
              <Alert tone="error">{signUpState.error}</Alert>
              <AuthField
                autoComplete="name"
                label={text.name}
                name="name"
                placeholder={text.namePlaceholder}
              />
              <AuthField
                autoCapitalize="none"
                autoComplete="username"
                hint={
                  <>
                    <span>{text.usernameHint}</span>
                    <span className="hidden items-center gap-1 font-semibold text-[var(--splity-mint)] sm:inline-flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--splity-mint)]" />
                      {text.usernameOk}
                    </span>
                  </>
                }
                label={text.username}
                mono
                name="username"
                prefix="@"
                placeholder={text.usernamePlaceholder}
              />
              <AuthField
                autoCapitalize="none"
                autoComplete="email"
                label={text.email}
                name="email"
                placeholder={text.emailPlaceholder}
                type="email"
              />
              <AuthField
                autoComplete="new-password"
                label={text.password}
                minLength={6}
                name="password"
                placeholder={text.newPasswordPlaceholder}
                type="password"
              />
              <AuthSubmitButton
                idleLabel={text.createAccount}
                pendingLabel={text.creatingAccount}
              />
            </form>
          ) : (
            <form action={signInAction} className="grid gap-3">
              <input name="redirectTo" type="hidden" value="./dashboard" />
              <Alert tone="error">{signInState.error ?? callbackError}</Alert>
              <AuthField
                autoCapitalize="none"
                autoComplete="email"
                label={text.email}
                name="email"
                placeholder={text.emailPlaceholder}
                type="email"
              />
              <AuthField
                autoComplete="current-password"
                label={text.password}
                name="password"
                placeholder={text.currentPasswordPlaceholder}
                type="password"
              />
              <AuthSubmitButton
                idleLabel={text.logIn}
                pendingLabel={text.loggingIn}
              />
            </form>
          )}

          <div className="mt-4 flex items-center justify-end gap-4 border-t border-dashed border-[var(--splity-line)] pt-4 text-[13px]">
            {isRegister ? (
              <span className="font-[var(--splity-mono)] text-[11px] uppercase tracking-wide text-[var(--splity-muted)]">
                <Link className="hover:text-[var(--splity-navy)]" href="/terms">
                  {text.terms}
                </Link>{" "}
                ·{" "}
                <Link className="hover:text-[var(--splity-navy)]" href="/privacy">
                  {text.privacy}
                </Link>
              </span>
            ) : (
              <button
                className="whitespace-nowrap font-semibold text-[var(--splity-navy)] underline decoration-[var(--splity-gold)] underline-offset-4"
                onClick={() => setIsResetOpen(true)}
                type="button"
              >
                {text.forgotPassword}
              </button>
            )}
          </div>
        </section>
      </main>

      <footer className="hidden shrink-0 items-center justify-between gap-4 px-8 pb-3 font-[var(--splity-mono)] text-[11px] uppercase tracking-wide text-[var(--splity-muted)] lg:flex">
        <span>{text.footerLeft}</span>
        <span>{text.footerRight}</span>
      </footer>

      <ForgotPasswordModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        text={text}
      />
    </div>
  );
}
