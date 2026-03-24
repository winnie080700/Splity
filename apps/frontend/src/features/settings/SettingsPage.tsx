import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthErrorMessage } from "@/shared/auth/authMessages";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard } from "@/shared/ui/primitives";
import { CheckIcon, SettingsIcon } from "@/shared/ui/icons";
import { getErrorMessage } from "@/shared/utils/format";

export function SettingsPage() {
  const { user, updateUser, signOut } = useAuth();
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.getCurrentUser()
  });

  const profile = profileQuery.data ?? user;

  useEffect(() => {
    if (profileQuery.data) {
      updateUser(profileQuery.data);
    }
  }, [profileQuery.data, updateUser]);

  useEffect(() => {
    setName(profile?.name ?? "");
  }, [profile?.name]);

  const updateNameMutation = useMutation({
    mutationFn: () => apiClient.updateProfile({ name: name.trim() }),
    onSuccess: async (nextUser) => {
      updateUser(nextUser);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setNameError(null);
    },
    onError: (error) => setNameError(getAuthErrorMessage(error, t))
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => apiClient.changePassword(passwordForm),
    onSuccess: () => {
      setPasswordError(null);
      setPasswordSuccess(t("settings.passwordSuccess"));
      setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    },
    onError: (error) => {
      setPasswordSuccess(null);
      setPasswordError(getAuthErrorMessage(error, t));
    }
  });

  const sendVerificationMutation = useMutation({
    mutationFn: () => apiClient.sendEmailVerification(),
    onSuccess: async (nextUser) => {
      updateUser(nextUser);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setVerificationError(null);
      setVerificationSuccess(t("settings.verificationSent"));
    },
    onError: (error) => {
      setVerificationSuccess(null);
      setVerificationError(getAuthErrorMessage(error, t));
    }
  });

  const verifyEmailMutation = useMutation({
    mutationFn: () => apiClient.verifyEmail({ code: verificationCode.trim() }),
    onSuccess: async (nextUser) => {
      updateUser(nextUser);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setVerificationError(null);
      setVerificationSuccess(t("settings.verificationSuccess"));
      setVerificationCode("");
    },
    onError: (error) => {
      setVerificationSuccess(null);
      setVerificationError(getAuthErrorMessage(error, t));
    }
  });

  function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setNameError(t("auth.nameRequired"));
      return;
    }

    setNameError(null);
    updateNameMutation.mutate();
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordForm.currentPassword.trim()) {
      setPasswordSuccess(null);
      setPasswordError(t("settings.currentPasswordRequired"));
      return;
    }

    if (!passwordForm.newPassword.trim()) {
      setPasswordSuccess(null);
      setPasswordError(t("settings.newPasswordRequired"));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordSuccess(null);
      setPasswordError(t("auth.errorPasswordConfirmationMismatch"));
      return;
    }

    setPasswordError(null);
    setPasswordSuccess(null);
    changePasswordMutation.mutate();
  }

  function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!verificationCode.trim()) {
      setVerificationSuccess(null);
      setVerificationError(t("auth.emailVerificationCodeRequired"));
      return;
    }

    setVerificationError(null);
    setVerificationSuccess(null);
    verifyEmailMutation.mutate();
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    signOut();
    navigate("/", { replace: true });
  }

  if (profileQuery.isPending && !profile) {
    return (
      <div className="space-y-6">
        <SectionCard className="p-6 md:p-7">
          <LoadingState lines={4} />
        </SectionCard>
      </div>
    );
  }

  if (profileQuery.isError && !profile) {
    return (
      <div className="space-y-6">
        <SectionCard className="p-6 md:p-7">
          <InlineMessage tone="error" title={t("feedback.loadFailed")} action={<button className="button-secondary" onClick={() => profileQuery.refetch()} type="button">{t("common.retry")}</button>}>
            {getErrorMessage(profileQuery.error)}
          </InlineMessage>
        </SectionCard>
      </div>
    );
  }

  const verificationPendingUntil = profile?.emailVerificationPendingUntilUtc
    ? new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-MY", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(profile.emailVerificationPendingUntilUtc))
    : null;

  return (
    <div className="space-y-6">
      <SectionCard className="p-6 md:p-7">
        <PageHeading
          eyebrow={t("settings.eyebrow")}
          title={t("settings.title")}
          description={t("settings.body")}
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.04fr,0.96fr]">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/92 p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky text-brand shadow-soft">
                <SettingsIcon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
                  {t("settings.account")}
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
                  {profile?.name ?? t("settings.accountFallback")}
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {t("auth.email")}
                </div>
                <div className="mt-2 text-sm font-medium text-ink">{profile?.email ?? "-"}</div>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {t("settings.emailStatus")}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-ink">
                  {profile?.isEmailVerified ? <CheckIcon className="h-4 w-4 text-success" /> : null}
                  {profile?.isEmailVerified ? t("settings.emailVerified") : t("settings.emailUnverified")}
                </div>
              </div>
            </div>
          </div>

          <div className="surface-muted p-5">
            <div className="text-sm font-semibold text-ink">{t("settings.sessionTitle")}</div>
            <p className="mt-2 text-sm leading-6 text-muted">{t("settings.sessionBody")}</p>

            <div className="mt-5">
              <button className="button-danger w-full sm:w-auto" onClick={handleSignOut} type="button">
                {t("auth.logout")}
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <SectionCard className="p-6">
          <PageHeading
            eyebrow={t("settings.profileEyebrow")}
            title={t("settings.profileTitle")}
            description={t("settings.profileBody")}
          />

          <form className="mt-6 space-y-4" onSubmit={handleNameSubmit}>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("auth.name")}</span>
              <input
                className={["input-base", nameError ? "border-danger focus:border-danger focus:ring-danger/10" : ""].join(" ")}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (nameError) {
                    setNameError(null);
                  }
                }}
              />
            </label>

            {nameError ? <InlineMessage tone="error">{nameError}</InlineMessage> : null}

            <div className="flex justify-end">
              <button className="button-primary" disabled={updateNameMutation.isPending || name.trim().length === 0} type="submit">
                {updateNameMutation.isPending ? <LoadingSpinner /> : null}
                {t("common.saveChanges")}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard className="p-6">
          <PageHeading
            eyebrow={t("settings.passwordEyebrow")}
            title={t("settings.passwordTitle")}
            description={t("settings.passwordBody")}
          />

          <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("settings.currentPassword")}</span>
              <input
                className={["input-base", passwordError ? "border-danger focus:border-danger focus:ring-danger/10" : ""].join(" ")}
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("settings.newPassword")}</span>
              <input
                className={["input-base", passwordError ? "border-danger focus:border-danger focus:ring-danger/10" : ""].join(" ")}
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("settings.confirmNewPassword")}</span>
              <input
                className={["input-base", passwordError ? "border-danger focus:border-danger focus:ring-danger/10" : ""].join(" ")}
                type="password"
                value={passwordForm.confirmNewPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmNewPassword: event.target.value }))}
              />
            </label>

            {passwordError ? <InlineMessage tone="error">{passwordError}</InlineMessage> : null}
            {passwordSuccess ? <InlineMessage tone="success">{passwordSuccess}</InlineMessage> : null}

            <div className="flex justify-end">
              <button className="button-primary" disabled={changePasswordMutation.isPending} type="submit">
                {changePasswordMutation.isPending ? <LoadingSpinner /> : null}
                {t("settings.changePasswordAction")}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard className="p-6">
        <PageHeading
          eyebrow={t("settings.verificationEyebrow")}
          title={t("settings.verificationTitle")}
          description={t("settings.verificationBody")}
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.92fr,1.08fr]">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/92 p-5 shadow-soft">
            <div className="text-sm font-semibold text-ink">{t("settings.emailStatus")}</div>
            <p className="mt-2 text-sm leading-6 text-muted">
              {profile?.isEmailVerified ? t("settings.emailVerifiedBody") : t("settings.emailUnverifiedBody")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={[
                "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold",
                profile?.isEmailVerified
                  ? "border-emerald-200 bg-emerald-50 text-success"
                  : "border-slate-200 bg-slate-100 text-slate-700"
              ].join(" ")}>
                {profile?.isEmailVerified ? t("settings.emailVerified") : t("settings.emailUnverified")}
              </span>
              {!profile?.isEmailVerified ? (
                <button className="button-secondary" disabled={sendVerificationMutation.isPending} onClick={() => sendVerificationMutation.mutate()} type="button">
                  {sendVerificationMutation.isPending ? <LoadingSpinner /> : null}
                  {t("settings.sendVerificationAction")}
                </button>
              ) : null}
            </div>
            {verificationPendingUntil && !profile?.isEmailVerified ? (
              <p className="mt-4 text-sm text-muted">
                {t("settings.verificationPendingUntil").replace("{time}", verificationPendingUntil)}
              </p>
            ) : null}
          </div>

          <div className="surface-muted p-5">
            <div className="text-sm font-semibold text-ink">{t("settings.verificationCodeTitle")}</div>
            <p className="mt-2 text-sm leading-6 text-muted">{t("settings.verificationCodeBody")}</p>

            <form className="mt-5 space-y-4" onSubmit={handleVerifyEmail}>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("settings.verificationCode")}</span>
                <input
                  className={["input-base", verificationError ? "border-danger focus:border-danger focus:ring-danger/10" : ""].join(" ")}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={t("settings.verificationCodePlaceholder")}
                  value={verificationCode}
                  onChange={(event) => {
                    setVerificationCode(event.target.value.replace(/\s+/g, ""));
                    if (verificationError) {
                      setVerificationError(null);
                    }
                  }}
                />
              </label>

              {verificationError ? <InlineMessage tone="error">{verificationError}</InlineMessage> : null}
              {verificationSuccess ? <InlineMessage tone="success">{verificationSuccess}</InlineMessage> : null}

              <div className="flex justify-end">
                <button className="button-primary" disabled={verifyEmailMutation.isPending || profile?.isEmailVerified === true} type="submit">
                  {verifyEmailMutation.isPending ? <LoadingSpinner /> : null}
                  {t("settings.verifyEmailAction")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
