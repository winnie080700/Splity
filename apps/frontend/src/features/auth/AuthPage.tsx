import { useMutation } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { useSignIn, useSignUp } from "@clerk/react/legacy";
import type { SignInResource, SignUpResource } from "@clerk/shared/types";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ModalDialog } from "@/shared/ui/dialog";
import { AnimatedPillSwitch } from "@/shared/ui/AnimatedPillSwitch";
import { PublicSiteFooter } from "@/shared/ui/PublicSiteFooter";
import { PublicSiteHeader } from "@/shared/ui/PublicSiteHeader";
import { InlineMessage, LoadingSpinner } from "@/shared/ui/primitives";

type Mode = "login" | "register";
type RegisterStep = "details" | "verify";
type LoginStep = "details" | "verify";
type ForgotPasswordStep = "email" | "code" | "password";
type SocialProvider = "google" | "github";
type OAuthStrategy = "oauth_google" | "oauth_github";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeVerificationCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function getClerkFutureErrorMessage(error: unknown, fallback: string) {
  const candidate = error as { errors?: Array<{ longMessage?: string; message?: string }> } | null | undefined;
  return candidate?.errors?.[0]?.longMessage
    ?? candidate?.errors?.[0]?.message
    ?? fallback;
}

function getClerkErrorMessage(error: unknown, fallback: string) {
  const candidate = error as { errors?: Array<{ longMessage?: string; message?: string }> } | null | undefined;
  return candidate?.errors?.[0]?.longMessage
    ?? candidate?.errors?.[0]?.message
    ?? (error instanceof Error ? error.message : fallback);
}

function toAppPath(target: string) {
  const resolved = new URL(target, window.location.origin);
  if (resolved.origin !== window.location.origin) {
    window.location.assign(target);
    return null;
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

function AuthStatusShell({
  title,
  body,
  error
}: {
  title: string;
  body: string;
  error?: string | null;
}) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#161616]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-10">
        <PublicSiteHeader
          brandMode="logo"
          secondaryLink={{ label: t("auth.backHome"), to: "/" }}
        />

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-0 sm:py-10 lg:py-12">
          <div className="auth-panel-surface w-full max-w-[520px] text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a59c85]">
              {t("auth.panelEyebrow")}
            </div>
            <h1 className="landing-display mt-3 text-[3rem] leading-[0.9] text-[#1c1a16] sm:text-[3.5rem]">
              {title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#7e776a]">
              {body}
            </p>

            {error ? (
              <div className="mt-6">
                <InlineMessage tone="error">{error}</InlineMessage>
              </div>
            ) : (
              <div className="mt-8 flex justify-center">
                <LoadingSpinner />
              </div>
            )}
          </div>
        </main>

        <PublicSiteFooter />
      </div>
    </div>
  );
}

function PinCodeInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");
  const activeIndex = value.length >= 6 ? 5 : value.length;

  return (
    <div
      className="auth-pin-shell"
      onClick={() => {
        if (!disabled) {
          inputRef.current?.focus();
        }
      }}
      role="presentation"
    >
      <input
        ref={inputRef}
        aria-label="Verification code"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        className="auth-pin-hidden"
        disabled={disabled}
        inputMode="numeric"
        maxLength={6}
        value={value}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onChange(normalizeVerificationCode(event.target.value))}
        onFocus={() => setIsFocused(true)}
      />

      <div className="auth-pin-grid" aria-hidden="true">
        {digits.map((digit, index) => (
          <div
            key={index}
            className={`auth-pin-cell${isFocused && index === activeIndex ? " auth-pin-cell-active" : ""}${digit ? " auth-pin-cell-filled" : ""}`}
          >
            {digit || ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialAuthButton({
  provider,
  label,
  disabled,
  isLoading,
  onClick
}: {
  provider: SocialProvider;
  label: string;
  disabled: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="auth-social-button"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="auth-social-icon" aria-hidden="true">
        {provider === "google" ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.7 3-4.2 3-7.4Z" fill="#4285F4" />
            <path d="M12 22c2.7 0 5-1 6.7-2.6l-3.3-2.6c-.9.6-2 .9-3.4.9-2.6 0-4.7-1.7-5.5-4H3.1v2.7A10 10 0 0 0 12 22Z" fill="#34A853" />
            <path d="M6.5 13.7A6 6 0 0 1 6.2 12c0-.6.1-1.1.3-1.7V7.6H3.1A10 10 0 0 0 2 12c0 1.6.4 3 1.1 4.4l3.4-2.7Z" fill="#FBBC05" />
            <path d="M12 6.3c1.4 0 2.7.5 3.7 1.5l2.8-2.8A10 10 0 0 0 3.1 7.6l3.4 2.7c.8-2.3 3-4 5.5-4Z" fill="#EA4335" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12 .5A12 12 0 0 0 8.2 23.9c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.3-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.3-3.3-.1-.3-.6-1.6.1-3.3 0 0 1.1-.3 3.5 1.3 1-.3 2.1-.4 3.2-.4s2.2.1 3.2.4c2.4-1.6 3.5-1.3 3.5-1.3.7 1.7.2 3 .1 3.3.8.9 1.3 2 1.3 3.3 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1 .8 2.1v3.1c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
          </svg>
        )}
      </span>

      <span>{label}</span>
      {isLoading ? <LoadingSpinner /> : null}
    </button>
  );
}

export function AuthPage() {
  const { hasWorkspaceAccess, continueAsGuest, isClerkConfigured, isLoading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="min-h-screen bg-[#f7f4ed]" />;
  }

  if (hasWorkspaceAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isClerkConfigured) {
    return (
      <AuthPageShell
        mode="register"
        title={t("auth.register")}
        formError={t("auth.clerkConfigMissing")}
        formSuccess={null}
        isSubmitting={false}
        isAuthFlowLoaded={false}
        showVerification={false}
        onModeChange={(nextMode) => navigate(nextMode === "register" ? "/auth?mode=register" : "/auth")}
        onContinueAsGuest={() => {
          const groupId = continueAsGuest(t("guest.defaultGroupName"));
          navigate(`/groups/${groupId}/overview`, { replace: true });
        }}
      >
        <div className="space-y-2.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">{t("auth.email")}</span>
          <input className="auth-input" disabled type="email" />
        </div>
        <div className="space-y-2.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">{t("auth.password")}</span>
          <input className="auth-input" disabled type="password" />
        </div>
      </AuthPageShell>
    );
  }

  return <ClerkAuthPage continueAsGuest={continueAsGuest} />;
}

export function AuthSsoCallbackPage() {
  const { isClerkConfigured } = useAuth();

  if (!isClerkConfigured) {
    return <Navigate to="/auth" replace />;
  }

  return <ClerkSsoCallbackPage />;
}

function ClerkSsoCallbackPage() {
  const { t } = useI18n();
  const { syncCurrentUser } = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeRedirect() {
      try {
        await clerk.handleRedirectCallback(
          {
            signInFallbackRedirectUrl: "/dashboard",
            signUpFallbackRedirectUrl: "/dashboard",
            signInForceRedirectUrl: "/dashboard",
            signUpForceRedirectUrl: "/dashboard",
            signInUrl: "/auth",
            signUpUrl: "/auth?mode=register"
          },
          async (target) => {
            await syncCurrentUser();

            if (cancelled) {
              return;
            }

            const appPath = toAppPath(target);
            if (appPath) {
              navigate(appPath, { replace: true });
            }
          }
        );
      }
      catch (nextError) {
        if (!cancelled) {
          setError(getClerkErrorMessage(nextError, t("auth.errorUnexpected")));
        }
      }
    }

    void completeRedirect();

    return () => {
      cancelled = true;
    };
  }, [clerk, navigate, syncCurrentUser, t]);

  return (
    <AuthStatusShell
      title={t("auth.ssoCallbackTitle")}
      body={t("auth.ssoCallbackBody")}
      error={error}
    />
  );
}

function ClerkAuthPage({
  continueAsGuest
}: {
  continueAsGuest: (defaultGroupName: string) => string;
}) {
  const { t } = useI18n();
  const { syncCurrentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isLoaded: isSignInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
  const requestedMode: Mode = searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<Mode>(requestedMode);
  const [registerStep, setRegisterStep] = useState<RegisterStep>("details");
  const [loginStep, setLoginStep] = useState<LoginStep>("details");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginVerificationCode, setLoginVerificationCode] = useState("");
  const [registerVerificationCode, setRegisterVerificationCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<SocialProvider | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordCode, setForgotPasswordCode] = useState("");
  const [forgotPasswordPassword, setForgotPasswordPassword] = useState("");
  const [forgotPasswordConfirmPassword, setForgotPasswordConfirmPassword] = useState("");
  const [forgotPasswordStep, setForgotPasswordStep] = useState<ForgotPasswordStep>("email");
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState<string | null>(null);
  const redirectTo = (location.state as { from?: string } | undefined)?.from ?? "/dashboard";

  useEffect(() => {
    setMode(requestedMode);
    setFormError(null);
    setFormSuccess(null);
  }, [requestedMode]);

  useEffect(() => {
    if (mode === "login") {
      setRegisterStep("details");
      setRegisterVerificationCode("");
      setFormSuccess(null);
    }
    else {
      setLoginStep("details");
      setLoginVerificationCode("");
      setFormSuccess(null);
    }
  }, [mode]);

  const isAuthFlowLoaded = isSignInLoaded && isSignUpLoaded;

  async function activateSession(
    resource: SignInResource | SignUpResource,
    setActive: ((params: { session: string }) => Promise<void>) | undefined
  ) {
    if (!resource.createdSessionId || !setActive) {
      throw new Error(t("auth.errorUnexpected"));
    }

    await setActive({ session: resource.createdSessionId });
    await syncCurrentUser();
    navigate(redirectTo, { replace: true });
  }

  async function handleSocialAuth(strategy: OAuthStrategy, provider: SocialProvider) {
    if (!isAuthFlowLoaded) {
      return;
    }

    setFormError(null);
    setFormSuccess(null);
    setSocialLoadingProvider(provider);

    try {
      const redirectUrl = new URL("/auth/sso-callback", window.location.origin).toString();
      const redirectUrlComplete = new URL(redirectTo, window.location.origin).toString();

      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl,
        redirectUrlComplete,
        continueSignIn: true
      });
    }
    catch (error) {
      setSocialLoadingProvider(null);
      setFormError(getClerkErrorMessage(error, t("auth.errorUnexpected")));
    }
  }

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthFlowLoaded) {
        throw new Error(t("auth.errorUnexpected"));
      }

      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
        username: username.trim().replace(/^@+/, ""),
        firstName: name.trim()
      });

      if (result.status === "complete") {
        await activateSession(result, setActiveSignUp);
        return;
      }

      const prepared = await result.prepareEmailAddressVerification({ strategy: "email_code" });
      setRegisterStep("verify");
      setFormSuccess(t("settings.verificationSent"));
      return prepared;
    },
    onError: (error) => {
      setFormSuccess(null);
      setFormError(getClerkErrorMessage(error, t("auth.errorUnexpected")));
    }
  });

  const registerVerifyMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthFlowLoaded) {
        throw new Error(t("auth.errorUnexpected"));
      }

      const result = await signUp.attemptEmailAddressVerification({
        code: registerVerificationCode.trim()
      });

      if (result.status !== "complete") {
        throw new Error(t("auth.errorUnexpected"));
      }

      await activateSession(result, setActiveSignUp);
    },
    onError: (error) => {
      setFormSuccess(null);
      setFormError(getClerkErrorMessage(error, t("auth.errorUnexpected")));
    }
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthFlowLoaded) {
        throw new Error(t("auth.errorUnexpected"));
      }

      const result = await signIn.create({
        strategy: "password",
        identifier: email.trim(),
        password
      });

      if (result.status === "complete") {
        await activateSession(result, setActiveSignIn);
        return;
      }

      if (result.status === "needs_second_factor") {
        const emailFactorSupported = result.supportedSecondFactors?.some((factor) => factor.strategy === "email_code");
        if (!emailFactorSupported) {
          throw new Error(t("auth.errorUnexpected"));
        }

        const prepared = await result.prepareSecondFactor({ strategy: "email_code" });
        setLoginStep("verify");
        setFormSuccess(t("settings.verificationSent"));
        return prepared;
      }

      throw new Error(t("auth.errorUnexpected"));
    },
    onError: (error) => {
      setFormSuccess(null);
      setFormError(getClerkErrorMessage(error, t("auth.errorUnexpected")));
    }
  });

  const loginVerifyMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthFlowLoaded) {
        throw new Error(t("auth.errorUnexpected"));
      }

      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code: loginVerificationCode.trim()
      });

      if (result.status !== "complete") {
        throw new Error(t("auth.errorUnexpected"));
      }

      await activateSession(result, setActiveSignIn);
    },
    onError: (error) => {
      setFormSuccess(null);
      setFormError(getClerkErrorMessage(error, t("auth.errorUnexpected")));
    }
  });

  const forgotPasswordSendMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthFlowLoaded) {
        throw new Error(t("auth.errorUnexpected"));
      }

      await signIn.create({ identifier: forgotPasswordEmail.trim() });
      const result = await signIn.__internal_future.resetPasswordEmailCode.sendCode();
      if (result.error) {
        throw new Error(getClerkFutureErrorMessage(result.error, t("auth.errorUnexpected")));
      }

      setForgotPasswordStep("code");
      setForgotPasswordSuccess(t("settings.verificationSent"));
      return null;
    },
    onError: (error) => {
      setForgotPasswordSuccess(null);
      setForgotPasswordError(getClerkErrorMessage(error, t("auth.errorUnexpected")));
    }
  });

  const forgotPasswordVerifyMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthFlowLoaded) {
        throw new Error(t("auth.errorUnexpected"));
      }

      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: forgotPasswordCode.trim()
      });

      if (result.status !== "needs_new_password") {
        throw new Error(t("auth.errorUnexpected"));
      }

      setForgotPasswordStep("password");
      setForgotPasswordSuccess(null);
      return result;
    },
    onError: (error) => {
      setForgotPasswordSuccess(null);
      setForgotPasswordError(getClerkErrorMessage(error, t("auth.errorUnexpected")));
    }
  });

  const forgotPasswordResetMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthFlowLoaded) {
        throw new Error(t("auth.errorUnexpected"));
      }

      const result = await signIn.resetPassword({
        password: forgotPasswordPassword
      });

      if (result.status !== "complete") {
        throw new Error(t("auth.errorUnexpected"));
      }

      await activateSession(result, setActiveSignIn);
    },
    onError: (error) => {
      setForgotPasswordSuccess(null);
      setForgotPasswordError(getClerkErrorMessage(error, t("auth.errorUnexpected")));
    }
  });

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode);
    setFormError(null);
    setFormSuccess(null);
    setSocialLoadingProvider(null);
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
    if (!isAuthFlowLoaded) {
      return;
    }

    if (mode === "register") {
      if (registerStep === "verify") {
        if (normalizeVerificationCode(registerVerificationCode).length !== 6) {
          setFormError(t("auth.emailVerificationCodeRequired"));
          return;
        }

        setFormError(null);
        registerVerifyMutation.mutate();
        return;
      }

      if (!name.trim()) {
        setFormError(t("auth.nameRequired"));
        return;
      }

      if (!username.trim()) {
        setFormError(t("auth.usernameRequired"));
        return;
      }
    }

    if (mode === "login" && loginStep === "verify") {
      if (normalizeVerificationCode(loginVerificationCode).length !== 6) {
        setFormError(t("auth.emailVerificationCodeRequired"));
        return;
      }

      setFormError(null);
      loginVerifyMutation.mutate();
      return;
    }

    if (!email.trim()) {
      setFormError(t("auth.emailRequired"));
      return;
    }

    if (!isValidEmail(email)) {
      setFormError(t("auth.errorEmailInvalid"));
      return;
    }

    if (!password.trim()) {
      setFormError(t("auth.passwordRequired"));
      return;
    }

    setFormError(null);
    setFormSuccess(null);
    if (mode === "register") {
      registerMutation.mutate();
    }
    else {
      loginMutation.mutate();
    }
  }

  function handleForgotPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthFlowLoaded) {
      return;
    }

    if (forgotPasswordStep === "email") {
      if (!forgotPasswordEmail.trim()) {
        setForgotPasswordError(t("auth.emailRequired"));
        return;
      }

      if (!isValidEmail(forgotPasswordEmail)) {
        setForgotPasswordError(t("auth.errorEmailInvalid"));
        return;
      }

      setForgotPasswordError(null);
      forgotPasswordSendMutation.mutate();
      return;
    }

    if (forgotPasswordStep === "code") {
      if (normalizeVerificationCode(forgotPasswordCode).length !== 6) {
        setForgotPasswordError(t("auth.emailVerificationCodeRequired"));
        return;
      }

      setForgotPasswordError(null);
      forgotPasswordVerifyMutation.mutate();
      return;
    }

    if (!forgotPasswordPassword.trim()) {
      setForgotPasswordError(t("auth.passwordRequired"));
      return;
    }

    if (forgotPasswordPassword !== forgotPasswordConfirmPassword) {
      setForgotPasswordError(t("auth.errorPasswordConfirmationMismatch"));
      return;
    }

    setForgotPasswordError(null);
    forgotPasswordResetMutation.mutate();
  }

  function handleContinueAsGuest() {
    const groupId = continueAsGuest(t("guest.defaultGroupName"));
    navigate(`/groups/${groupId}/overview`, { replace: true });
  }

  function resetForgotPasswordModal() {
    setForgotPasswordEmail(email.trim());
    setForgotPasswordCode("");
    setForgotPasswordPassword("");
    setForgotPasswordConfirmPassword("");
    setForgotPasswordStep("email");
    setForgotPasswordError(null);
    setForgotPasswordSuccess(null);
  }

  const showVerification = (mode === "login" && loginStep === "verify") || (mode === "register" && registerStep === "verify");
  const isSubmitting = registerMutation.isPending
    || registerVerifyMutation.isPending
    || loginMutation.isPending
    || loginVerifyMutation.isPending;
  const isSocialLoading = socialLoadingProvider !== null;

  const authTitle = useMemo(() => {
    if (mode === "register") {
      return registerStep === "verify" ? t("settings.verificationTitle") : t("auth.register");
    }

    return loginStep === "verify" ? t("settings.verificationTitle") : t("auth.login");
  }, [loginStep, mode, registerStep, t]);

  const socialActions = showVerification ? null : (
    <div className="mt-5 space-y-3">
      <div className="auth-social-divider">
        <span>{t("auth.orContinueWith")}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SocialAuthButton
          disabled={!isAuthFlowLoaded || isSubmitting || isSocialLoading}
          isLoading={socialLoadingProvider === "google"}
          label={t("auth.continueWithGoogle")}
          provider="google"
          onClick={() => {
            void handleSocialAuth("oauth_google", "google");
          }}
        />
        <SocialAuthButton
          disabled={!isAuthFlowLoaded || isSubmitting || isSocialLoading}
          isLoading={socialLoadingProvider === "github"}
          label={t("auth.continueWithGithub")}
          provider="github"
          onClick={() => {
            void handleSocialAuth("oauth_github", "github");
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      <AuthPageShell
        mode={mode}
        title={authTitle}
        formError={formError}
        formSuccess={formSuccess}
        isSubmitting={isSubmitting || isSocialLoading}
        isAuthFlowLoaded={isAuthFlowLoaded}
        showVerification={showVerification}
        onModeChange={handleModeChange}
        onContinueAsGuest={handleContinueAsGuest}
        onSubmit={handleSubmit}
        afterSubmitContent={socialActions}
        secondaryAction={mode === "login" && loginStep === "details" ? (
          <div className="flex justify-end pt-1">
            <button
              className="self-start text-sm font-medium text-[#6e685c] transition hover:text-[#4f641b]"
              onClick={() => {
                resetForgotPasswordModal();
                setIsForgotPasswordOpen(true);
              }}
              type="button"
            >
              {t("auth.forgotPassword")}
            </button>
          </div>
        ) : null}
        footerAction={showVerification ? (
          <button
            className="font-medium text-xs text-[#5d7420] transition hover:text-[#475c1a] w-full"
            onClick={() => {
              if (mode === "login") {
                setLoginStep("details");
                setLoginVerificationCode("");
              }
              else {
                setRegisterStep("details");
                setRegisterVerificationCode("");
              }
              setFormError(null);
              setFormSuccess(null);
            }}
            type="button"
          >
            {t("common.cancel")}
          </button>
        ) : undefined}
      >
        {mode === "register" && registerStep === "details" ? (
          <>
            <label className="space-y-2.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">{t("auth.name")}</span>
              <input
                className="auth-input"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFormError(null);
                  setFormSuccess(null);
                }}
              />
            </label>

            <label className="space-y-2.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">{t("auth.username")}</span>
              <div className="flex min-h-[52px] items-center gap-2 rounded-[18px] border border-[rgba(212,203,186,0.98)] bg-[rgba(255,253,248,0.96)] px-4">
                <span className="text-sm font-semibold text-[#5f7520]">@</span>
                <input
                  className="min-h-[44px] flex-1 border-0 bg-transparent px-0 py-0 text-sm text-[#181612] outline-none focus:outline-none focus:ring-0"
                  value={username}
                  placeholder={t("auth.usernamePlaceholder")}
                  onChange={(event) => {
                    setUsername(event.target.value.replace(/^@+/, ""));
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                />
              </div>
            </label>
          </>
        ) : null}

        {showVerification ? (
          <label className="space-y-3">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">
              {t("settings.verificationCode")}
            </span>

            <PinCodeInput
              autoFocus
              disabled={isSubmitting}
              value={mode === "login" ? loginVerificationCode : registerVerificationCode}
              onChange={(nextValue) => {
                if (mode === "login") {
                  setLoginVerificationCode(nextValue);
                }
                else {
                  setRegisterVerificationCode(nextValue);
                }
                setFormError(null);
                setFormSuccess(null);
              }}
            />

            <p className="text-xs leading-6 text-[#8d8778]">{t("settings.verificationCodeBody")}</p>
          </label>
        ) : (
          <>
            <label className="space-y-2.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">{t("auth.email")}</span>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFormError(null);
                  setFormSuccess(null);
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
                  setFormError(null);
                  setFormSuccess(null);
                }}
              />
            </label>
          </>
        )}
      </AuthPageShell>

      <ModalDialog
        open={isForgotPasswordOpen}
        title={t("auth.forgotPasswordDialogTitle")}
        description={forgotPasswordStep === "email"
          ? t("auth.forgotPasswordDialogBody")
          : forgotPasswordStep === "code"
            ? t("settings.verificationCodeBody")
            : t("settings.passwordBody")}
        onClose={() => {
          if (!forgotPasswordSendMutation.isPending && !forgotPasswordVerifyMutation.isPending && !forgotPasswordResetMutation.isPending) {
            setIsForgotPasswordOpen(false);
          }
        }}
        actions={(
          <>
            <button
              className="button-secondary"
              disabled={forgotPasswordSendMutation.isPending || forgotPasswordVerifyMutation.isPending || forgotPasswordResetMutation.isPending}
              onClick={() => {
                setIsForgotPasswordOpen(false);
                resetForgotPasswordModal();
              }}
              type="button"
            >
              {t("common.dismiss")}
            </button>
            <button
              className="button-primary"
              disabled={forgotPasswordSendMutation.isPending || forgotPasswordVerifyMutation.isPending || forgotPasswordResetMutation.isPending}
              form="forgot-password-form"
              type="submit"
            >
              {forgotPasswordSendMutation.isPending || forgotPasswordVerifyMutation.isPending || forgotPasswordResetMutation.isPending ? <LoadingSpinner /> : null}
              {forgotPasswordStep === "email"
                ? t("auth.forgotPasswordSend")
                : forgotPasswordStep === "code"
                  ? t("settings.verifyEmailAction")
                  : t("settings.changePasswordAction")}
            </button>
          </>
        )}
      >
        <form id="forgot-password-form" className="space-y-4" onSubmit={handleForgotPasswordSubmit}>
          {forgotPasswordStep === "email" ? (
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">{t("auth.email")}</span>
              <input
                className="input-base min-h-[46px] rounded-xl"
                type="email"
                value={forgotPasswordEmail}
                onChange={(event) => {
                  setForgotPasswordEmail(event.target.value);
                  setForgotPasswordError(null);
                  setForgotPasswordSuccess(null);
                }}
              />
            </label>
          ) : null}

          {forgotPasswordStep === "code" ? (
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">{t("settings.verificationCode")}</span>
              <PinCodeInput
                autoFocus
                disabled={forgotPasswordVerifyMutation.isPending}
                value={forgotPasswordCode}
                onChange={(nextValue) => {
                  setForgotPasswordCode(nextValue);
                  setForgotPasswordError(null);
                }}
              />
            </label>
          ) : null}

          {forgotPasswordStep === "password" ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-medium text-muted">{t("settings.newPassword")}</span>
                <input
                  className="input-base min-h-[46px] rounded-xl"
                  type="password"
                  value={forgotPasswordPassword}
                  onChange={(event) => {
                    setForgotPasswordPassword(event.target.value);
                    setForgotPasswordError(null);
                  }}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-muted">{t("settings.confirmNewPassword")}</span>
                <input
                  className="input-base min-h-[46px] rounded-xl"
                  type="password"
                  value={forgotPasswordConfirmPassword}
                  onChange={(event) => {
                    setForgotPasswordConfirmPassword(event.target.value);
                    setForgotPasswordError(null);
                  }}
                />
              </label>
            </>
          ) : null}

          {forgotPasswordSuccess ? <InlineMessage tone="success">{forgotPasswordSuccess}</InlineMessage> : null}
          {forgotPasswordError ? <InlineMessage tone="error">{forgotPasswordError}</InlineMessage> : null}
        </form>
      </ModalDialog>
    </>
  );
}

function AuthPageShell({
  mode,
  title,
  formError,
  formSuccess,
  isSubmitting,
  isAuthFlowLoaded,
  showVerification,
  onModeChange,
  onContinueAsGuest,
  onSubmit,
  children,
  secondaryAction,
  afterSubmitContent,
  footerAction
}: {
  mode: Mode;
  title: string;
  formError: string | null;
  formSuccess: string | null;
  isSubmitting: boolean;
  isAuthFlowLoaded: boolean;
  showVerification: boolean;
  onModeChange: (nextMode: Mode) => void;
  onContinueAsGuest: () => void;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  secondaryAction?: React.ReactNode;
  afterSubmitContent?: React.ReactNode;
  footerAction?: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#161616]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-10">
        <PublicSiteHeader
          brandMode="logo"
          secondaryLink={{ label: t("auth.backHome"), to: "/" }}
        />

        <main className="flex flex-1 items-center px-4 py-10 sm:px-0 sm:py-10 lg:py-12">
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
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a59c85]">
                    {t("auth.panelEyebrow")}
                  </div>
                  <h2 className="landing-display mt-3 text-[3rem] leading-[0.88] text-[#1c1a16] sm:text-[3.75rem] w-full">
                    {title}
                  </h2>
                </div>

                {showVerification ? null : (
                  <AnimatedPillSwitch
                    ariaLabel={t("auth.panelEyebrow")}
                    className="mt-8"
                    size="regular"
                    value={mode}
                    onChange={onModeChange}
                    options={[
                      { value: "login", label: t("auth.login") },
                      { value: "register", label: t("auth.register") }
                    ]}
                  />
                )}

                <form className="mt-8 space-y-5" onSubmit={onSubmit}>
                  {children}
                  {secondaryAction}
                  {formSuccess ? <InlineMessage tone="success">{formSuccess}</InlineMessage> : null}
                  {formError ? <InlineMessage tone="error">{formError}</InlineMessage> : null}

                  <button className="landing-contact-button w-full text-sm" disabled={!isAuthFlowLoaded || isSubmitting} type="submit">
                    {isSubmitting ? <LoadingSpinner /> : null}
                    {showVerification ? t("settings.verifyEmailAction") : mode === "register" ? t("auth.registerAction") : t("auth.loginAction")}
                  </button>

                  {afterSubmitContent}

                  {footerAction ?? (
                    <button
                      className="font-medium text-xs text-[#5d7420] transition hover:text-[#475c1a] w-full"
                      disabled={isSubmitting}
                      onClick={onContinueAsGuest}
                      type="button"
                    >
                      {t("auth.continueAsGuest")}
                    </button>
                  )}
                </form>

                {showVerification ? null : (
                  <div className="mt-6 border-t border-[#ebe4d7] pt-5 text-xs text-[#7d776a]">
                    {mode === "register" ? (
                      <button className="font-thin text-[#5d7420] transition hover:text-[#475c1a]" onClick={() => onModeChange("login")} type="button">
                        {t("auth.switchToLogin")}
                      </button>
                    ) : (
                      <button className="font-medium text-[#5d7420] transition hover:text-[#475c1a]" onClick={() => onModeChange("register")} type="button">
                        {t("auth.switchToRegister")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>

        <PublicSiteFooter />
      </div>
    </div>
  );
}
