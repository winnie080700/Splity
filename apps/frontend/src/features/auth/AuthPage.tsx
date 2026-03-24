import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/shared/auth/AuthProvider";
import { getAuthErrorMessage } from "@/shared/auth/authMessages";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { AppFooter } from "@/shared/ui/AppFooter";
import { ModalDialog } from "@/shared/ui/dialog";
import { InlineMessage, LoadingSpinner } from "@/shared/ui/primitives";

type Mode = "login" | "register";
const FORGOT_PASSWORD_COOLDOWN_MS = 60_000;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, signIn } = useAuth();
  const requestedMode: Mode = searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<Mode>(requestedMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [forgotPasswordCooldownUntil, setForgotPasswordCooldownUntil] = useState<number | null>(null);
  const [forgotPasswordSecondsRemaining, setForgotPasswordSecondsRemaining] = useState(0);
  const redirectTo = (location.state as { from?: string } | undefined)?.from ?? "/dashboard";

  useEffect(() => {
    setMode(requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    if (!forgotPasswordCooldownUntil) {
      setForgotPasswordSecondsRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((forgotPasswordCooldownUntil - Date.now()) / 1000));
      setForgotPasswordSecondsRemaining(remaining);
      if (remaining === 0) {
        setForgotPasswordCooldownUntil(null);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(timer);
  }, [forgotPasswordCooldownUntil]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const authMutation = useMutation({
    mutationFn: async () => {
      if (mode === "register") {
        return apiClient.register({ name: name.trim(), email: email.trim(), password });
      }

      return apiClient.login({ email: email.trim(), password });
    },
    onSuccess: (session) => {
      signIn(session);
      navigate(redirectTo, { replace: true });
    },
    onError: (error) => setFormError(getAuthErrorMessage(error, t))
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: () => apiClient.forgotPassword({ email: forgotPasswordEmail.trim() }),
    onSuccess: () => {
      setForgotPasswordError(null);
      setForgotPasswordSubmitted(true);
      setForgotPasswordCooldownUntil(Date.now() + FORGOT_PASSWORD_COOLDOWN_MS);
    },
    onError: (error) => setForgotPasswordError(getAuthErrorMessage(error, t))
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authMutation.isPending) return;

    if (mode === "register" && !name.trim()) {
      setFormError(t("auth.nameRequired"));
      return;
    }

    if (!email.trim()) {
      setFormError(t("auth.emailRequired"));
      return;
    }

    if (!password.trim()) {
      setFormError(t("auth.passwordRequired"));
      return;
    }

    setFormError(null);
    authMutation.mutate();
  }

  function handleForgotPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (forgotPasswordMutation.isPending || forgotPasswordSecondsRemaining > 0) {
      return;
    }

    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordError(t("auth.emailRequired"));
      return;
    }

    if (!isValidEmail(forgotPasswordEmail)) {
      setForgotPasswordError(t("auth.errorEmailInvalid"));
      return;
    }

    setForgotPasswordError(null);
    forgotPasswordMutation.mutate();
  }

  const forgotPasswordActionLabel = forgotPasswordSubmitted
    ? forgotPasswordSecondsRemaining > 0
      ? t("auth.forgotPasswordResendIn").replace("{seconds}", String(forgotPasswordSecondsRemaining))
      : t("auth.forgotPasswordResend")
    : t("auth.forgotPasswordSend");

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(135deg,#12b886_0%,#39d0c9_58%,#74e0ff_100%)]">
      <div className="relative flex-1 overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -left-16 -top-10 h-64 w-64 rounded-full border-[36px] border-white/18" />
          <div className="absolute left-[10%] top-[12%] h-20 w-20 rounded-full border-[10px] border-white/15" />
          <div className="absolute bottom-[8%] left-[8%] h-72 w-72 rounded-full border-[26px] border-white/14" />
          <div className="absolute right-[18%] top-[18%] h-44 w-44 rounded-full border-[18px] border-white/18" />
          <div className="absolute right-[10%] top-[8%] h-48 w-48 rotate-45 border border-white/25" />
          <div className="absolute left-[38%] top-[18%] h-px w-48 rotate-[135deg] bg-white/30" />
          <div className="absolute right-[8%] bottom-[14%] h-px w-56 rotate-[135deg] bg-white/30" />
          <div className="absolute left-[18%] bottom-[32%] flex gap-3">
            <span className="block h-px w-10 rotate-[135deg] bg-white/45" />
            <span className="block h-px w-10 rotate-[135deg] bg-white/45" />
            <span className="block h-px w-10 rotate-[135deg] bg-white/45" />
          </div>
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-9rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="px-2 text-white sm:px-4">
            <div className="flex items-center gap-4">
              <BrandLogo className="h-14 w-14 rounded-2xl bg-white/12 p-1.5 backdrop-blur" />
              <div>
                <div className="text-4xl font-semibold tracking-tight">Splity</div>
                <div className="mt-1 text-sm uppercase tracking-[0.28em] text-white/70">{t("app.kicker")}</div>
              </div>
            </div>
            <div className="mt-10 max-w-xl space-y-5">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                {t("auth.heroTitle")}
              </h1>
              <p className="text-lg leading-8 text-white/84">
                {t("auth.heroBody")}
              </p>
              <div className="flex items-center gap-4 pt-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand shadow-soft">
                  <span className="ml-1 block h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-brand" />
                </span>
                <div className="text-sm leading-7 text-white/78">
                  {t("home.quickStart1")} {t("home.quickStart3")}
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md rounded-[28px] bg-white px-7 py-8 shadow-[0_28px_60px_rgba(15,23,42,0.18)] sm:px-8">
            <div className="text-center">
              <h2 className="text-4xl font-semibold tracking-tight text-brand">
                {mode === "register" ? t("auth.register") : t("auth.login")}
              </h2>
            </div>

            <div className="mt-6 flex gap-2 rounded-full bg-slate-100 p-1">
              <button className={["flex-1 rounded-full px-4 py-2 text-sm font-semibold transition", mode === "login" ? "bg-white text-ink shadow-soft" : "text-muted"].join(" ")} onClick={() => { setMode("login"); setFormError(null); }} type="button">{t("auth.login")}</button>
              <button className={["flex-1 rounded-full px-4 py-2 text-sm font-semibold transition", mode === "register" ? "bg-white text-ink shadow-soft" : "text-muted"].join(" ")} onClick={() => { setMode("register"); setFormError(null); }} type="button">{t("auth.register")}</button>
            </div>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <label className="space-y-2">
                  <span className="text-sm font-medium text-muted">{t("auth.name")}</span>
                  <input className="input-base min-h-[46px] rounded-xl" value={name} onChange={(event) => { setName(event.target.value); if (formError) { setFormError(null); } }} />
                </label>
              ) : null}
              <label className="space-y-2">
                <span className="text-sm font-medium text-muted">{t("auth.email")}</span>
                <input className="input-base min-h-[46px] rounded-xl" type="email" value={email} onChange={(event) => { setEmail(event.target.value); if (formError) { setFormError(null); } }} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-muted">{t("auth.password")}</span>
                <input className="input-base min-h-[46px] rounded-xl" type="password" value={password} onChange={(event) => { setPassword(event.target.value); if (formError) { setFormError(null); } }} />
              </label>

              <label className="flex items-center gap-3 pt-1 text-sm text-muted">
                <input className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/20" type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                <span>{t("auth.rememberMe")}</span>
              </label>

              {formError ? <InlineMessage tone="error">{formError}</InlineMessage> : null}

              <button className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-soft hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" disabled={authMutation.isPending} type="submit">
                {authMutation.isPending ? <LoadingSpinner /> : null}
                {mode === "register" ? t("auth.registerAction") : t("auth.loginAction")}
              </button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm">
              <button
                className="text-slate-400 transition hover:text-brand"
                onClick={() => {
                  setForgotPasswordError(null);
                  setForgotPasswordEmail((current) => current || email.trim());
                  setIsForgotPasswordOpen(true);
                }}
                type="button"
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="px-4 pb-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <AppFooter />
        </div>
      </div>

      <ModalDialog
        open={isForgotPasswordOpen}
        title={t("auth.forgotPasswordDialogTitle")}
        description={t("auth.forgotPasswordDialogBody")}
        onClose={() => {
          if (!forgotPasswordMutation.isPending) {
            setForgotPasswordError(null);
            setIsForgotPasswordOpen(false);
          }
        }}
        actions={(
          <>
            <button
              className="button-secondary"
              disabled={forgotPasswordMutation.isPending}
              onClick={() => {
                setForgotPasswordError(null);
                setIsForgotPasswordOpen(false);
              }}
              type="button"
            >
              {t("common.dismiss")}
            </button>
            <button
              className="button-primary"
              disabled={forgotPasswordMutation.isPending || forgotPasswordSecondsRemaining > 0}
              form="forgot-password-form"
              type="submit"
            >
              {forgotPasswordMutation.isPending ? <LoadingSpinner /> : null}
              {forgotPasswordActionLabel}
            </button>
          </>
        )}
      >
        <form id="forgot-password-form" className="space-y-4" onSubmit={handleForgotPasswordSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">{t("auth.email")}</span>
            <input
              className="input-base min-h-[46px] rounded-xl"
              type="email"
              value={forgotPasswordEmail}
              onChange={(event) => {
                setForgotPasswordEmail(event.target.value);
                if (forgotPasswordError) {
                  setForgotPasswordError(null);
                }
              }}
            />
          </label>

          <div className="text-sm leading-6 text-muted">{t("auth.forgotPasswordEmailHint")}</div>

          {forgotPasswordSubmitted ? (
            <InlineMessage tone="success">{t("auth.forgotPasswordSuccess")}</InlineMessage>
          ) : null}

          {forgotPasswordError ? <InlineMessage tone="error">{forgotPasswordError}</InlineMessage> : null}
        </form>
      </ModalDialog>
    </div>
  );
}
