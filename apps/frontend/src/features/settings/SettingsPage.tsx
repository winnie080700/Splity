import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthErrorMessage } from "@/shared/auth/authMessages";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { AnimatedPillSwitch } from "@/shared/ui/AnimatedPillSwitch";
import { CheckIcon, PencilIcon, SettingsIcon } from "@/shared/ui/icons";
import { InlineMessage, LoadingSpinner, LoadingState } from "@/shared/ui/primitives";
import { getErrorMessage } from "@/shared/utils/format";

type SettingsTab = "profile" | "security" | "language";

export function SettingsPage() {
  const { user, updateUser, signOut, isGuest } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState(user?.name ?? "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.getCurrentUser(),
    enabled: !isGuest
  });

  const profile = profileQuery.data ?? user;

  useEffect(() => {
    if (profileQuery.data) {
      updateUser(profileQuery.data);
    }
  }, [profileQuery.data, updateUser]);

  useEffect(() => {
    setName(profile?.name ?? "");
    setIsEditingProfile(false);
  }, [profile?.name]);

  const updateNameMutation = useMutation({
    mutationFn: () => apiClient.updateProfile({ name: name.trim() }),
    onSuccess: async (nextUser) => {
      updateUser(nextUser);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setNameError(null);
      setIsEditingProfile(false);
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

  if (isGuest) {
    return <Navigate to="/dashboard" replace />;
  }

  if (profileQuery.isPending && !profile) {
    return (
      <div className="space-y-6">
        <section className="dashboard-surface p-6 md:p-7">
          <LoadingState lines={4} />
        </section>
      </div>
    );
  }

  if (profileQuery.isError && !profile) {
    return (
      <div className="space-y-6">
        <section className="dashboard-surface p-6 md:p-7">
          <InlineMessage
            tone="error"
            title={t("feedback.loadFailed")}
            action={(
              <button className="workspace-shell-trigger" onClick={() => profileQuery.refetch()} type="button">
                {t("common.retry")}
              </button>
            )}
          >
            {getErrorMessage(profileQuery.error)}
          </InlineMessage>
        </section>
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

  const tabs: Array<{ key: SettingsTab; label: string }> = [
    { key: "profile", label: t("settings.tabProfile") },
    { key: "security", label: t("settings.tabSecurity") },
    { key: "language", label: t("settings.tabLanguage") }
  ];

  return (
    <div className="space-y-6">
      <section className="dashboard-surface overflow-hidden p-0">
        <div className="border-b border-[#e8e0cf] px-6 py-6 md:px-8 md:py-7">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#918970]">
            {t("settings.title")}
          </div>
        </div>

        <div className="scroll-panel overflow-x-auto border-b border-[#ece4d4]">
          <div className="settings-tab-strip min-w-max px-4 sm:px-6 md:px-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={["settings-tab-button", activeTab === tab.key ? "settings-tab-button-active" : ""].join(" ")}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6 md:px-8 md:py-7">
          {activeTab === "profile" ? (
            <div className="space-y-6">
              <section className="settings-panel">
                <div className="settings-section-label">{t("settings.profileEyebrow")}</div>

                <form className="mt-6 space-y-4" onSubmit={handleNameSubmit}>
                  <div className="settings-data-card">
                    <div className="flex items-center justify-between gap-3">
                      <div className="settings-data-label">{t("auth.name")}</div>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e4dccb] bg-[#fffdf8] text-[#5f7520]"
                        aria-label={t("settings.profileTitle")}
                        onClick={() => {
                          setIsEditingProfile(true);
                          setNameError(null);
                        }}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {isEditingProfile ? (
                      <input
                        className="auth-input mt-3"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          if (nameError) {
                            setNameError(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div className="mt-3 text-sm font-medium text-[#191713]">{profile?.name ?? t("settings.accountFallback")}</div>
                    )}
                  </div>

                  <div className="settings-data-card">
                    <div className="settings-data-label">{t("auth.email")}</div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-medium text-[#191713]">{profile?.email ?? "-"}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={[
                          "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em]",
                          profile?.isEmailVerified
                            ? "border-[#d8e4c0] bg-[#eef5e3] text-[#56701a]"
                            : "border-[#e4dccb] bg-[#fbf8f1] text-[#6f6859]"
                        ].join(" ")}>
                          {profile?.isEmailVerified ? t("settings.emailVerified") : t("settings.emailUnverified")}
                        </span>
                        {!profile?.isEmailVerified ? (
                          <button
                            className="workspace-shell-trigger min-h-[38px] px-3 py-2 text-xs"
                            disabled={sendVerificationMutation.isPending}
                            onClick={() => sendVerificationMutation.mutate()}
                            type="button"
                          >
                            {sendVerificationMutation.isPending ? <LoadingSpinner /> : null}
                            {t("settings.sendVerificationAction")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {verificationPendingUntil && !profile?.isEmailVerified ? (
                    <div className="settings-data-card">
                      <div className="settings-data-label">{t("settings.emailStatus")}</div>
                      <p className="mt-3 text-sm leading-6 text-[#7d776a]">
                        {t("settings.verificationPendingUntil").replace("{time}", verificationPendingUntil)}
                      </p>
                    </div>
                  ) : null}

                  {nameError ? <InlineMessage tone="error">{nameError}</InlineMessage> : null}
                  {verificationError ? <InlineMessage tone="error">{verificationError}</InlineMessage> : null}
                  {verificationSuccess ? <InlineMessage tone="success">{verificationSuccess}</InlineMessage> : null}

                  <div className="flex justify-end">
                    <button
                      className="landing-contact-button min-w-0 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={!isEditingProfile || updateNameMutation.isPending || name.trim().length === 0}
                      type="submit"
                    >
                      {updateNameMutation.isPending ? <LoadingSpinner /> : null}
                      {t("common.saveChanges")}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          ) : null}

          {activeTab === "security" ? (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
                <section className="settings-panel">
                  <div className="settings-section-label">{t("settings.verificationEyebrow")}</div>
                  <h2 className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-[#171511]">
                    {t("settings.verificationTitle")}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[#7d776a]">
                    {profile?.isEmailVerified ? t("settings.emailVerifiedBody") : t("settings.emailUnverifiedBody")}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className={[
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold",
                      profile?.isEmailVerified
                        ? "border-[#d8e4c0] bg-[#eef5e3] text-[#56701a]"
                        : "border-[#e4dccb] bg-[#fbf8f1] text-[#6f6859]"
                    ].join(" ")}>
                      {profile?.isEmailVerified ? t("settings.emailVerified") : t("settings.emailUnverified")}
                    </span>

                    {!profile?.isEmailVerified ? (
                      <button
                        className="workspace-shell-trigger"
                        disabled={sendVerificationMutation.isPending}
                        onClick={() => sendVerificationMutation.mutate()}
                        type="button"
                      >
                        {sendVerificationMutation.isPending ? <LoadingSpinner /> : null}
                        {t("settings.sendVerificationAction")}
                      </button>
                    ) : null}
                  </div>

                  {verificationPendingUntil && !profile?.isEmailVerified ? (
                    <p className="mt-4 text-sm text-[#7d776a]">
                      {t("settings.verificationPendingUntil").replace("{time}", verificationPendingUntil)}
                    </p>
                  ) : null}

                  <form className="mt-6 space-y-4 border-t border-[#ece4d4] pt-6" onSubmit={handleVerifyEmail}>
                    <label className="space-y-2.5">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">
                        {t("settings.verificationCode")}
                      </span>
                      <input
                        className="auth-input"
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
                      <button
                        className="landing-contact-button min-w-0"
                        disabled={verifyEmailMutation.isPending || profile?.isEmailVerified === true}
                        type="submit"
                      >
                        {verifyEmailMutation.isPending ? <LoadingSpinner /> : null}
                        {t("settings.verifyEmailAction")}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="space-y-6">
                  <section className="settings-panel">
                    <div className="settings-section-label">{t("settings.passwordEyebrow")}</div>
                    <h2 className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-[#171511]">
                      {t("settings.passwordTitle")}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[#7d776a]">
                      {t("settings.passwordBody")}
                    </p>

                    <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
                      <label className="space-y-2.5">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">
                          {t("settings.currentPassword")}
                        </span>
                        <input
                          className="auth-input"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                        />
                      </label>

                      <label className="space-y-2.5">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">
                          {t("settings.newPassword")}
                        </span>
                        <input
                          className="auth-input"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                        />
                      </label>

                      <label className="space-y-2.5">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#807969]">
                          {t("settings.confirmNewPassword")}
                        </span>
                        <input
                          className="auth-input"
                          type="password"
                          value={passwordForm.confirmNewPassword}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, confirmNewPassword: event.target.value }))}
                        />
                      </label>

                      {passwordError ? <InlineMessage tone="error">{passwordError}</InlineMessage> : null}
                      {passwordSuccess ? <InlineMessage tone="success">{passwordSuccess}</InlineMessage> : null}

                      <div className="flex justify-end">
                        <button className="landing-contact-button min-w-0" disabled={changePasswordMutation.isPending} type="submit">
                          {changePasswordMutation.isPending ? <LoadingSpinner /> : null}
                          {t("settings.changePasswordAction")}
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className="settings-panel">
                    <div className="settings-section-label">{t("settings.sessionTitle")}</div>
                    <h2 className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-[#171511]">
                      {t("auth.logout")}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[#7d776a]">
                      {t("settings.sessionBody")}
                    </p>

                    <div className="mt-6">
                      <button className="button-danger w-full sm:w-auto" onClick={handleSignOut} type="button">
                        {t("auth.logout")}
                      </button>
                    </div>
                  </section>
                </section>
              </div>
            </div>
          ) : null}

          {activeTab === "language" ? (
            <div className="grid gap-6 xl:grid-cols-[0.94fr,1.06fr]">
              <section className="settings-panel">
                <div className="settings-section-label">{t("lang.language")}</div>
                <h2 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.03em] text-[#171511]">
                  {t("settings.tabLanguage")}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#7d776a]">
                  {t("settings.languageBody")}
                </p>
              </section>

              <section className="settings-panel">
                <div className="settings-section-label">{t("lang.current")}</div>
                <h2 className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-[#171511]">
                  {language === "zh" ? t("lang.chinese") : t("lang.english")}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#7d776a]">
                  {t("settings.languageBody")}
                </p>

                <div className="mt-6 max-w-[260px]">
                  <AnimatedPillSwitch
                    ariaLabel={t("lang.language")}
                    size="regular"
                    value={language}
                    onChange={(nextLanguage) => setLanguage(nextLanguage)}
                    options={[
                      { value: "en", label: "EN" },
                      { value: "zh", label: "CH" }
                    ]}
                  />
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
