import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/shared/auth/AuthProvider";
import { getAuthErrorMessage } from "@/shared/auth/authMessages";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ModalDialog } from "@/shared/ui/dialog";
import { AnimatedPillSwitch } from "@/shared/ui/AnimatedPillSwitch";
import { PublicSiteFooter } from "@/shared/ui/PublicSiteFooter";
import { PublicSiteHeader } from "@/shared/ui/PublicSiteHeader";
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
  const { hasWorkspaceAccess, signIn, continueAsGuest } = useAuth();
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

  if (hasWorkspaceAccess) {
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

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode);
    setFormError(null);
    navigate(
      {
        pathname: "/auth",
        search: nextMode === "register" ? "?mode=register" : ""
      },
      {
        replace: true,
        state: location.state
      }
    );
  }

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

  const authHighlights = [
    {
      index: "01",
      title: t("auth.featureFlowTitle"),
      body: t("auth.featureFlowBody")
    },
    {
      index: "02",
      title: t("auth.featureSettlementTitle"),
      body: t("auth.featureSettlementBody")
    },
    {
      index: "03",
      title: t("auth.featureStatusTitle"),
      body: t("auth.featureStatusBody")
    }
  ];

  function handleContinueAsGuest() {
    const groupId = continueAsGuest(t("guest.defaultGroupName"));
    navigate(`/groups/${groupId}/overview`, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#161616]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-10">
        <PublicSiteHeader
          brandMode="logo"
          secondaryLink={{ label: t("auth.backHome"), to: "/" }}
        />

        <main className="flex flex-1 items-center px-2 py-10 sm:px-0 sm:py-10 lg:py-12">
          <div className="grid w-full gap-10 sm:gap-12 lg:grid-cols-[1.04fr,0.96fr] lg:items-center">
            <section className="landing-fade-up px-1 sm:px-0 max-w-[680px]" style={{ animationDelay: "140ms" }}>

              <h1 className="landing-display mt-4 max-w-[12ch] text-[5rem] leading-[0.82] text-[#181612] sm:text-[5rem] lg:text-[5rem]">
                {t("auth.heroTitle")}
              </h1>

              <p className="mt-5 max-w-[560px] text-[14px] leading-7 text-[#7e776a] sm:text-[15px]">
                {t("auth.heroBody")}
              </p>

            </section>

            <section className="landing-fade-up px-1 sm:px-0" style={{ animationDelay: "220ms" }}>
              <div className="auth-panel-surface mx-auto w-full max-w-[560px]">

                <AnimatedPillSwitch
                  ariaLabel={t("auth.panelEyebrow")}
                  className="mt-8"
                  size="regular"
                  value={mode}
                  onChange={handleModeChange}
                  options={[
                    { value: "login", label: t("auth.login") },
                    { value: "register", label: t("auth.register") }
                  ]}
                />

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                  {mode === "register" ? (
                    <label className="space-y-2.5">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">{t("auth.name")}</span>
                      <input
                        className="auth-input"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          if (formError) {
                            setFormError(null);
                          }
                        }}
                      />
                    </label>
                  ) : null}

                  <label className="space-y-2.5">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">{t("auth.email")}</span>
                    <input
                      className="auth-input"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (formError) {
                          setFormError(null);
                        }
                      }}
                    />
                  </label>

                  <label className="space-y-2.5">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">{t("auth.password")}</span>
                    <input
                      className="auth-input"
                      type="password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (formError) {
                          setFormError(null);
                        }
                      }}
                    />
                  </label>

                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-3 text-sm text-[#6e685c]">
                      <input
                        className="h-4 w-4 rounded border-[#c8c0af] text-[#627a1e] focus:ring-[#627a1e]/20"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                      />
                      <span>{t("auth.rememberMe")}</span>
                    </label>

                    <button
                      className="self-start text-sm font-medium text-[#6e685c] transition hover:text-[#4f641b]"
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

                  {formError ? <InlineMessage tone="error">{formError}</InlineMessage> : null}

                  <button className="landing-contact-button w-full text-sm" disabled={authMutation.isPending} type="submit">
                    {authMutation.isPending ? <LoadingSpinner /> : null}
                    {mode === "register" ? t("auth.registerAction") : t("auth.loginAction")}
                  </button>
                  <button className="font-medium text-xs text-[#5d7420] transition hover:text-[#475c1a] w-full" disabled={authMutation.isPending} onClick={handleContinueAsGuest} type="button">
                    {t("auth.continueAsGuest")}
                  </button>

                </form>

                <div className="mt-6 border-t border-[#ebe4d7] pt-5 text-xs text-[#7d776a]">
                  {mode === "register" ? (
                    <button className="font-thin text-[#5d7420] transition hover:text-[#475c1a]" onClick={() => handleModeChange("login")} type="button">
                      {t("auth.switchToLogin")}
                    </button>
                  ) : (
                    <button className="font-medium text-[#5d7420] transition hover:text-[#475c1a]" onClick={() => handleModeChange("register")} type="button">
                      {t("auth.switchToRegister")}
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>

        <PublicSiteFooter />
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
