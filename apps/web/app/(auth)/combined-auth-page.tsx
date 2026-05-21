"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/brand-mark";
import { Alert } from "@/components/ui/alert";
import {
  requestPasswordReset,
  signIn,
  signUp,
  type AuthActionState,
  type PasswordActionState,
} from "./auth-actions";
import { AuthField, AuthSubmitButton } from "./auth-form-controls";

type AuthMode = "login" | "register";
type Language = "en" | "zh";

type CombinedAuthPageProps = {
  callbackError: string | null;
  initialMode: AuthMode;
  redirectTo: string;
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

const copy = {
  en: {
    backHome: "Back home",
    free: "Free · No card needed",
    heroA: "Split bills",
    heroB: "without the",
    heroC: "mess.",
    heroBody:
      "Keep participants, receipts, and settlement progress in one place instead of jumping between chat threads and spreadsheets.",
    receiptTitle: "Weekend Hotpot",
    receiptStatus: "Settled · May 14",
    receiptRows: [
      ["Hotpot night", "Leo paid", "¥856"],
      ["Late-night taxi", "You paid", "¥48"],
      ["7-Eleven run", "Mia paid", "¥72"],
    ],
    receiptTotal: "You get back",
    receiptStampA: "Settled",
    receiptStampB: "in 37s",
    account: "Account",
    registerTitle: "Register",
    loginTitle: "Welcome back",
    login: "Login",
    register: "Register",
    name: "Name",
    namePlaceholder: "Winnie Chan",
    username: "Username",
    usernamePlaceholder: "winniechng",
    usernameHint: "Letters, numbers, dot, underscore, or dash.",
    usernameOk: "3-30 chars",
    email: "Email",
    emailPlaceholder: "you@somewhere.com",
    password: "Password",
    newPasswordPlaceholder: "At least 6 characters",
    currentPasswordPlaceholder: "Your password",
    createAccount: "Create account",
    creatingAccount: "Creating account...",
    logIn: "Log in",
    loggingIn: "Signing in...",
    forgotPassword: "Forgot password?",
    terms: "Terms",
    privacy: "Privacy",
    footerLeft: "+ Splity · 2026",
    footerRight: "Made with care by Winnie",
    resetTitle: "Reset password",
    resetBody: "Enter your email and we will send a recovery link.",
    resetSubmit: "Send reset link",
    resetPending: "Sending reset link...",
    close: "Close",
  },
  zh: {
    backHome: "返回首页",
    free: "免费 · 无需银行卡",
    heroA: "分清每一笔",
    heroB: "不再混乱",
    heroC: "更好结算。",
    heroBody:
      "把成员、收据和付款进度放在同一个地方，不用在聊天记录和表格之间来回切换。",
    receiptTitle: "周末火锅",
    receiptStatus: "已结清 · 5月14日",
    receiptRows: [
      ["火锅晚餐", "Leo 已付", "¥856"],
      ["深夜打车", "你已付", "¥48"],
      ["便利店采购", "Mia 已付", "¥72"],
    ],
    receiptTotal: "你将收回",
    receiptStampA: "已结清",
    receiptStampB: "37秒",
    account: "账户",
    registerTitle: "注册",
    loginTitle: "欢迎回来",
    login: "登录",
    register: "注册",
    name: "姓名",
    namePlaceholder: "Winnie Chan",
    username: "用户名",
    usernamePlaceholder: "winniechng",
    usernameHint: "可使用字母、数字、点、下划线或短横线。",
    usernameOk: "3-30 个字符",
    email: "邮箱",
    emailPlaceholder: "you@somewhere.com",
    password: "密码",
    newPasswordPlaceholder: "至少 6 个字符",
    currentPasswordPlaceholder: "输入密码",
    createAccount: "创建账户",
    creatingAccount: "正在创建...",
    logIn: "登录",
    loggingIn: "正在登录...",
    forgotPassword: "忘记密码？",
    terms: "条款",
    privacy: "隐私",
    footerLeft: "+ Splity · 2026",
    footerRight: "Winnie 用心制作",
    resetTitle: "重置密码",
    resetBody: "输入邮箱，我们会发送密码恢复链接。",
    resetSubmit: "发送重置链接",
    resetPending: "正在发送...",
    close: "关闭",
  },
} as const;

function BackIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M19 12H5m6-6-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ReceiptPreview({ text }: { text: (typeof copy)[Language] }) {
  return (
    <div
      aria-hidden="true"
      className="relative mt-6 hidden max-w-[390px] -rotate-[1.4deg] rounded-[18px] border border-[var(--splity-line)] bg-white px-5 pb-4 pt-[18px] shadow-[0_24px_50px_rgba(12,21,56,0.08)] before:absolute before:-top-2.5 before:left-6 before:h-[18px] before:w-14 before:-rotate-6 before:rounded-[3px] before:border before:border-dashed before:border-[var(--splity-gold-strong)] before:bg-[#faefce] before:content-[''] md:block [@media(max-height:760px)]:hidden"
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="font-[var(--splity-display)] text-[15px] font-semibold">
          {text.receiptTitle}
        </p>
        <p className="font-[var(--splity-mono)] text-[10.5px] uppercase tracking-wide text-[var(--splity-muted)]">
          {text.receiptStatus}
        </p>
      </div>
      {text.receiptRows.map(([label, who, value]) => (
        <div
          className="grid grid-cols-[1fr_auto] items-center border-b border-dashed border-[var(--splity-line)] py-1.5 text-[12.5px] last:border-b-0"
          key={label}
        >
          <span className="font-medium">
            {label}
            <span className="ml-1 text-[11px] font-normal text-[var(--splity-muted)]">
              {who}
            </span>
          </span>
          <span className="font-[var(--splity-mono)] text-[12.5px] font-semibold">
            {value}
          </span>
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between border-t-2 border-[var(--splity-ink)] pt-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
          {text.receiptTotal}
        </span>
        <span className="font-[var(--splity-display)] text-xl font-bold text-[var(--splity-mint)]">
          +¥244.00
        </span>
      </div>
      <div className="absolute -bottom-3 -right-3 flex h-[72px] w-[72px] rotate-[8deg] flex-col items-center justify-center rounded-full border-2 border-dashed border-[rgba(27,42,107,0.25)] bg-[var(--splity-gold)] text-center font-[var(--splity-display)] text-[10px] font-extrabold uppercase leading-tight tracking-wider text-[var(--splity-navy)] shadow-[0_8px_18px_rgba(217,148,38,0.35)]">
        <span>{text.receiptStampA}</span>
        <span className="mt-[-2px] font-[var(--splity-serif)] text-xl font-normal italic tracking-tight">
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
  text: (typeof copy)[Language];
}) {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    forgotPasswordInitialState
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(12,21,56,0.45)] px-4 backdrop-blur-sm"
      role="presentation"
    >
      <section
        aria-labelledby="forgot-password-title"
        aria-modal="true"
        className="w-full max-w-md rounded-[24px] border border-[var(--splity-line)] bg-white p-6 shadow-[0_30px_80px_rgba(12,21,56,0.25)]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
              {text.account}
            </p>
            <h3
              className="mt-1 font-[var(--splity-display)] text-3xl font-bold tracking-tight"
              id="forgot-password-title"
            >
              {text.resetTitle}
            </h3>
          </div>
          <button
            aria-label={text.close}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--splity-line)] text-xl leading-none text-[var(--splity-muted)] transition hover:bg-[#f2f1ec] hover:text-[var(--splity-ink)]"
            onClick={onClose}
            type="button"
          >
            ×
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

export function CombinedAuthPage({
  callbackError,
  initialMode,
  redirectTo,
}: CombinedAuthPageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [language, setLanguage] = useState<Language>("en");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [signInState, signInAction] = useActionState(signIn, signInInitialState);
  const [signUpState, signUpAction] = useActionState(signUp, signUpInitialState);
  const isRegister = mode === "register";
  const text = copy[language];

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

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
            <BackIcon />
            {text.backHome}
          </Link>
          <button
            aria-label="Toggle language"
            className="relative hidden grid-cols-2 rounded-full border border-[var(--splity-line)] bg-white/70 p-1 text-[12.5px] font-semibold sm:inline-grid"
            onClick={() =>
              setLanguage((current) => (current === "en" ? "zh" : "en"))
            }
            type="button"
          >
            <span
              className={[
                "absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-[var(--splity-navy)] transition-transform",
                language === "zh" ? "translate-x-full" : "translate-x-0",
              ].join(" ")}
            />
            <span
              className={[
                "relative z-10 rounded-full px-2.5 py-1 transition-colors",
                language === "en" ? "text-white" : "text-[var(--splity-muted)]",
              ].join(" ")}
            >
              EN
            </span>
            <span
              className={[
                "relative z-10 rounded-full px-2.5 py-1 transition-colors",
                language === "zh" ? "text-white" : "text-[var(--splity-muted)]",
              ].join(" ")}
            >
              中
            </span>
          </button>
        </div>
      </nav>

      <main className="mx-auto grid w-full max-w-[1220px] flex-1 items-center gap-8 px-5 pb-8 pt-3 sm:px-10 lg:min-h-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(410px,460px)] lg:gap-10 lg:px-8 lg:pb-4 lg:pt-1">
        <section className="max-w-[520px] lg:pr-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--splity-line)] bg-white py-1.5 pl-2 pr-3.5 text-xs font-semibold uppercase tracking-[0.06em] lg:mb-3">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--splity-gold)] font-[var(--splity-display)] text-[11px] font-extrabold text-[var(--splity-navy)]">
              *
            </span>
            {text.free}
          </div>
          <h1 className="font-[var(--splity-display)] text-[clamp(2.9rem,5.2vw,4.35rem)] font-bold leading-[0.94] tracking-tight text-[var(--splity-ink)]">
            {text.heroA}
            <br />
            {text.heroB}
            <br />
            <span className="font-[var(--splity-serif)] font-normal italic text-[var(--splity-navy)]">
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
          <h2 className="mb-4 mt-1 font-[var(--splity-display)] text-[clamp(2.15rem,3.6vw,2.7rem)] font-bold leading-[1.02] tracking-tight">
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
              <input name="redirectTo" type="hidden" value={redirectTo} />
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
