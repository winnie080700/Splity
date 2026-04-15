import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type AuthPaymentProfileDto } from "@api-client";
import { useUser } from "@clerk/react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthErrorMessage } from "@/shared/auth/authMessages";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { prepareSettlementShareQrDataUrl } from "@/features/settlements/share";
import { AnimatedPillSwitch } from "@/shared/ui/AnimatedPillSwitch";
import { ModalDialog } from "@/shared/ui/dialog";
import { PencilIcon, SettingsIcon } from "@/shared/ui/icons";
import { InlineMessage, LoadingSpinner, LoadingState } from "@/shared/ui/primitives";
import { getErrorMessage } from "@/shared/utils/format";

type SettingsTab = "account" | "payment" | "general";

const EMPTY_PAYMENT_PROFILE: AuthPaymentProfileDto = {
  payeeName: "",
  paymentMethod: "",
  accountName: "",
  accountNumber: "",
  notes: "",
  paymentQrDataUrl: ""
};

function normalizePaymentProfile(paymentProfile: Partial<AuthPaymentProfileDto> | null | undefined): AuthPaymentProfileDto {
  return {
    payeeName: paymentProfile?.payeeName?.trim() ?? "",
    paymentMethod: paymentProfile?.paymentMethod?.trim() ?? "",
    accountName: paymentProfile?.accountName?.trim() ?? "",
    accountNumber: paymentProfile?.accountNumber?.trim() ?? "",
    notes: paymentProfile?.notes?.trim() ?? "",
    paymentQrDataUrl: paymentProfile?.paymentQrDataUrl?.trim() ?? ""
  };
}

function formatUsername(username: string | null | undefined, fallbackEmail?: string | null) {
  const baseValue = username?.trim().replace(/^@+/, "")
    || fallbackEmail?.trim().split("@")[0]?.replace(/^@+/, "")
    || "";

  return baseValue ? `@${baseValue}` : "";
}

export function SettingsPage() {
  const { user, updateUser, signOut, isGuest } = useAuth();
  const { isLoaded: isClerkLoaded, user: clerkUser } = useUser();
  const { t, language, setLanguage } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const qrInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [name, setName] = useState(user?.name ?? "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [paymentProfile, setPaymentProfile] = useState<AuthPaymentProfileDto>(user?.paymentProfile ?? EMPTY_PAYMENT_PROFILE);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [isPreparingQr, setIsPreparingQr] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.getCurrentUser(),
    enabled: !isGuest
  });

  const profile = profileQuery.data ?? user;
  const usernameValue = useMemo(
    () => formatUsername(profile?.username, profile?.email),
    [profile?.email, profile?.username]
  );
  const normalizedSavedPaymentProfile = normalizePaymentProfile(profile?.paymentProfile);
  const normalizedDraftPaymentProfile = normalizePaymentProfile(paymentProfile);
  const hasNameChanges = name.trim() !== (profile?.name ?? "").trim();
  const hasPaymentChanges = JSON.stringify(normalizedDraftPaymentProfile) !== JSON.stringify(normalizedSavedPaymentProfile);

  useEffect(() => {
    if (profileQuery.data) {
      updateUser(profileQuery.data);
    }
  }, [profileQuery.data, updateUser]);

  useEffect(() => {
    setName(profile?.name ?? "");
    setIsEditingName(false);
    setNameError(null);
    setNameSuccess(null);
  }, [profile?.name]);

  useEffect(() => {
    setPaymentProfile(profile?.paymentProfile ?? EMPTY_PAYMENT_PROFILE);
    setPaymentError(null);
    setPaymentSuccess(null);
  }, [profile?.paymentProfile]);

  const updateNameMutation = useMutation({
    mutationFn: () => apiClient.updateProfile({ name: name.trim() }),
    onSuccess: async (nextUser) => {
      updateUser(nextUser);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setNameError(null);
      setNameSuccess(t("feedback.saved"));
      setIsEditingName(false);
    },
    onError: (error) => {
      setNameSuccess(null);
      setNameError(getAuthErrorMessage(error, t));
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: () => apiClient.updatePaymentProfile(normalizedDraftPaymentProfile),
    onSuccess: async (nextUser) => {
      updateUser(nextUser);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setPaymentError(null);
      setPaymentSuccess(t("feedback.saved"));
    },
    onError: (error) => {
      setPaymentSuccess(null);
      setPaymentError(getAuthErrorMessage(error, t));
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!isClerkLoaded || !clerkUser) {
        throw new Error(t("auth.errorUnexpected"));
      }

      await clerkUser.updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        signOutOfOtherSessions: false
      });
    },
    onSuccess: () => {
      setPasswordError(null);
      setPasswordSuccess(t("settings.passwordSuccess"));
      setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setIsPasswordModalOpen(false);
    },
    onError: (error) => {
      setPasswordSuccess(null);
      setPasswordError(getErrorMessage(error));
    }
  });

  const sendVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!isClerkLoaded || !clerkUser?.primaryEmailAddress) {
        throw new Error(t("auth.errorUnexpected"));
      }

      await clerkUser.primaryEmailAddress.prepareVerification({ strategy: "email_code" });
    },
    onSuccess: async () => {
      setVerificationError(null);
      setVerificationSuccess(t("settings.verificationSent"));
    },
    onError: (error) => {
      setVerificationSuccess(null);
      setVerificationError(getErrorMessage(error));
    }
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async () => {
      if (!isClerkLoaded || !clerkUser?.primaryEmailAddress) {
        throw new Error(t("auth.errorUnexpected"));
      }

      await clerkUser.primaryEmailAddress.attemptVerification({ code: verificationCode.trim() });
      await clerkUser.reload();
      return apiClient.getCurrentUser();
    },
    onSuccess: async (nextUser) => {
      updateUser(nextUser);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setVerificationError(null);
      setVerificationSuccess(t("settings.verificationSuccess"));
      setVerificationCode("");
    },
    onError: (error) => {
      setVerificationSuccess(null);
      setVerificationError(getErrorMessage(error));
    }
  });

  function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setNameSuccess(null);
      setNameError(t("auth.nameRequired"));
      return;
    }

    setNameError(null);
    setNameSuccess(null);
    updateNameMutation.mutate();
  }

  function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentError(null);
    setPaymentSuccess(null);
    updatePaymentMutation.mutate();
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

  function handleVerifyEmailSubmit(event: FormEvent<HTMLFormElement>) {
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

  function handleOpenVerificationModal() {
    if (profile?.isEmailVerified) {
      return;
    }

    setVerificationCode("");
    setVerificationError(null);
    setVerificationSuccess(null);
    setIsVerificationModalOpen(true);
    sendVerificationMutation.mutate();
  }

  async function handleQrSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsPreparingQr(true);
      const dataUrl = await prepareSettlementShareQrDataUrl(file);
      setPaymentProfile((current) => ({ ...current, paymentQrDataUrl: dataUrl }));
      setPaymentError(null);
      setPaymentSuccess(null);
    }
    catch (error) {
      const code = error instanceof Error ? error.message : "";
      setPaymentSuccess(null);
      setPaymentError(
        ({
          "unsupported-file": t("settlement.shareQrInvalid"),
          "file-too-large": t("settlement.shareQrTooLarge"),
          "file-read-failed": t("settlement.shareQrReadFailed"),
          "image-load-failed": t("settlement.shareQrReadFailed")
        } as Record<string, string>)[code] ?? t("settlement.shareQrReadFailed")
      );
    }
    finally {
      setIsPreparingQr(false);
      event.target.value = "";
    }
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
              <div className="flex flex-wrap gap-2">
                <button className="workspace-shell-trigger" onClick={() => profileQuery.refetch()} type="button">
                  {t("common.retry")}
                </button>
                <button className="button-danger min-h-[40px] px-4 py-2" onClick={handleSignOut} type="button">
                  {t("auth.logout")}
                </button>
              </div>
            )}
          >
            {getErrorMessage(profileQuery.error)}
          </InlineMessage>
        </section>
      </div>
    );
  }

  const tabs = [
    { value: "account" as const, label: t("settings.accountTab") },
    { value: "payment" as const, label: t("settings.paymentTab") },
    { value: "general" as const, label: t("settings.generalTab") }
  ];

  return (
    <div className="space-y-6">
      <section className="dashboard-surface overflow-hidden p-0">
        <div className="border-b border-[#e8e0cf] px-6 py-6 md:px-8 md:py-7">
          <div className="flex items-center gap-4">
          </div>
        </div>

        <div className="border-b border-[#e8e0cf] px-4 sm:px-6 md:px-8">
          <div className="settings-tab-strip overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                className={["settings-tab-button", activeTab === tab.value ? "settings-tab-button-active" : ""].join(" ")}
                onClick={() => setActiveTab(tab.value)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6 md:px-8 md:py-7">
          {activeTab === "account" ? (
            <form className="space-y-5" onSubmit={handleNameSubmit}>
              <section className="settings-stack-section">
                <div className="settings-stack-heading">{t("settings.accountSecurityTitle")}</div>

                <div className="settings-stack-card">
                  <div className="settings-row">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("auth.username")}</div>
                      <div className="mt-2 text-sm font-medium text-[#191713]">{usernameValue || t("settings.accountFallback")}</div>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("auth.name")}</div>
                      {isEditingName ? (
                        <input
                          className="auth-input mt-3 w-full sm:max-w-[420px]"
                          value={name}
                          onChange={(event) => {
                            setName(event.target.value);
                            if (nameError) {
                              setNameError(null);
                            }
                            if (nameSuccess) {
                              setNameSuccess(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div className="mt-2 text-sm font-medium text-[#191713]">{profile?.name ?? t("settings.accountFallback")}</div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="workspace-shell-trigger min-h-[40px] px-3 py-2"
                      aria-label={t("settings.profileTitle")}
                      onClick={() => {
                        setIsEditingName(true);
                        setNameError(null);
                        setNameSuccess(null);
                      }}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("auth.email")}</div>
                      <div className="mt-2 text-sm font-medium text-[#191713]">{profile?.email ?? "-"}</div>
                    </div>

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
                          className="workspace-shell-trigger min-h-[40px] px-3 py-2 text-xs"
                          disabled={sendVerificationMutation.isPending}
                          onClick={handleOpenVerificationModal}
                          type="button"
                        >
                          {sendVerificationMutation.isPending ? <LoadingSpinner /> : null}
                          {t("settings.verifyNowAction")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("auth.password")}</div>
                      <div className="mt-2 text-sm text-[#7d776a]">**********</div>
                    </div>

                    <button
                      className="workspace-shell-trigger min-h-[40px] px-3 py-2"
                      onClick={() => {
                        setPasswordError(null);
                        setPasswordSuccess(null);
                        setIsPasswordModalOpen(true);
                      }}
                      type="button"
                    >
                      {t("settings.changePasswordAction")}
                    </button>
                  </div>
                </div>

                {nameError ? <InlineMessage tone="error">{nameError}</InlineMessage> : null}
                {nameSuccess ? <InlineMessage tone="success">{nameSuccess}</InlineMessage> : null}

                <div className="flex justify-end mt-5">
                  <button
                    className="landing-contact-button min-w-0 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!isEditingName || !hasNameChanges || updateNameMutation.isPending}
                    type="submit"
                  >
                    {updateNameMutation.isPending ? <LoadingSpinner /> : null}
                    {t("common.saveChanges")}
                  </button>
                </div>
              </section>
            </form>
          ) : null}

          {activeTab === "payment" ? (
            <form className="space-y-5" onSubmit={handlePaymentSubmit}>
              <section className="settings-stack-section">
                <div className="settings-stack-heading">{t("settings.paymentTab")}</div>

                <div className="settings-stack-card">
                  <div className="settings-row settings-row-wide">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("settlement.payeeName")}</div>
                      <input
                        className="auth-input mt-3 w-full"
                        value={paymentProfile.payeeName}
                        onChange={(event) => {
                          setPaymentProfile((current) => ({ ...current, payeeName: event.target.value }));
                          if (paymentError) {
                            setPaymentError(null);
                          }
                          if (paymentSuccess) {
                            setPaymentSuccess(null);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="settings-row settings-row-wide">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("settlement.paymentMethod")}</div>
                      <input
                        className="auth-input mt-3 w-full"
                        value={paymentProfile.paymentMethod}
                        onChange={(event) => {
                          setPaymentProfile((current) => ({ ...current, paymentMethod: event.target.value }));
                          if (paymentError) {
                            setPaymentError(null);
                          }
                          if (paymentSuccess) {
                            setPaymentSuccess(null);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="settings-row settings-row-wide">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("settlement.accountName")}</div>
                      <input
                        className="auth-input mt-3 w-full"
                        value={paymentProfile.accountName}
                        onChange={(event) => {
                          setPaymentProfile((current) => ({ ...current, accountName: event.target.value }));
                          if (paymentError) {
                            setPaymentError(null);
                          }
                          if (paymentSuccess) {
                            setPaymentSuccess(null);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="settings-row settings-row-wide">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("settlement.accountNumber")}</div>
                      <input
                        className="auth-input mt-3 w-full"
                        value={paymentProfile.accountNumber}
                        onChange={(event) => {
                          setPaymentProfile((current) => ({ ...current, accountNumber: event.target.value }));
                          if (paymentError) {
                            setPaymentError(null);
                          }
                          if (paymentSuccess) {
                            setPaymentSuccess(null);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="settings-row settings-row-wide">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("settlement.notes")}</div>
                      <textarea
                        className="auth-input mt-3 min-h-[120px] w-full resize-y py-3"
                        value={paymentProfile.notes}
                        onChange={(event) => {
                          setPaymentProfile((current) => ({ ...current, notes: event.target.value }));
                          if (paymentError) {
                            setPaymentError(null);
                          }
                          if (paymentSuccess) {
                            setPaymentSuccess(null);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("settlement.paymentQrLabel")}</div>
                      {paymentProfile.paymentQrDataUrl ? (
                        <div className="mt-4 w-full sm:max-w-[280px] rounded-[20px] border border-[#ebe4d7] bg-white p-3">
                          <div className="settings-data-label">{t("settlement.paymentQrPreview")}</div>
                          <div className="mt-3 flex justify-center rounded-[18px] bg-[#faf6ee] p-3">
                            <img
                              src={paymentProfile.paymentQrDataUrl}
                              alt={t("settlement.paymentQrAlt")}
                              className="max-h-48 w-auto rounded-[16px] object-contain"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-sm leading-6 text-[#7d776a]">{t("settlement.paymentQrEmpty")}</div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={qrInputRef}
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={handleQrSelected}
                      />
                      <button
                        className="workspace-shell-trigger min-h-[40px] px-3 py-2 text-xs"
                        disabled={isPreparingQr}
                        onClick={() => qrInputRef.current?.click()}
                        type="button"
                      >
                        {isPreparingQr ? <LoadingSpinner /> : null}
                        {paymentProfile.paymentQrDataUrl ? t("settlement.paymentQrReplace") : t("settlement.paymentQrUpload")}
                      </button>
                      {paymentProfile.paymentQrDataUrl ? (
                        <button
                          className="button-pill"
                          onClick={() => {
                            setPaymentProfile((current) => ({ ...current, paymentQrDataUrl: "" }));
                            setPaymentError(null);
                            setPaymentSuccess(null);
                          }}
                          type="button"
                        >
                          {t("settlement.paymentQrRemove")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {paymentError ? <InlineMessage tone="error">{paymentError}</InlineMessage> : null}
                {paymentSuccess ? <InlineMessage tone="success">{paymentSuccess}</InlineMessage> : null}

                <div className="flex justify-end mt-5">
                  <button
                    className="landing-contact-button min-w-0 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!hasPaymentChanges || updatePaymentMutation.isPending}
                    type="submit"
                  >
                    {updatePaymentMutation.isPending ? <LoadingSpinner /> : null}
                    {t("common.saveChanges")}
                  </button>
                </div>
              </section>
            </form>
          ) : null}

          {activeTab === "general" ? (
            <div className="space-y-5">
              <section className="settings-stack-section">
                <div className="settings-stack-heading">{t("settings.generalTitle")}</div>

                <div className="settings-stack-card">
                  <div className="settings-row">
                    <div className="settings-row-copy">
                      <div className="settings-data-label">{t("settings.currentLanguage")}</div>
                      <div className="mt-2 text-sm font-medium text-[#191713]">
                        {language === "zh" ? t("lang.chinese") : t("lang.english")}
                      </div>
                    </div>

                    <div className="flex w-full justify-start sm:max-w-[240px] sm:justify-end">
                      <AnimatedPillSwitch
                        ariaLabel={t("lang.language")}
                        value={language}
                        onChange={(nextLanguage) => setLanguage(nextLanguage)}
                        options={[
                          { value: "en", label: "EN" },
                          { value: "zh", label: "CH" }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="settings-row">
                    <button className="button-danger min-h-[40px] px-4 py-2" onClick={handleSignOut} type="button">
                      {t("auth.logout")}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </section>

      <ModalDialog
        open={isPasswordModalOpen}
        title={t("settings.passwordTitle")}
        description={t("settings.passwordBody")}
        onClose={() => {
          if (!changePasswordMutation.isPending) {
            setPasswordError(null);
            setPasswordSuccess(null);
            setIsPasswordModalOpen(false);
            setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
          }
        }}
        actions={(
          <>
            <button
              className="workspace-shell-trigger"
              disabled={changePasswordMutation.isPending}
              onClick={() => {
                setPasswordError(null);
                setPasswordSuccess(null);
                setIsPasswordModalOpen(false);
                setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
              }}
              type="button"
            >
              {t("common.dismiss")}
            </button>
            <button className="landing-contact-button min-w-0" disabled={changePasswordMutation.isPending} form="change-password-form" type="submit">
              {changePasswordMutation.isPending ? <LoadingSpinner /> : null}
              {t("settings.changePasswordAction")}
            </button>
          </>
        )}
      >
        <form id="change-password-form" className="space-y-4" onSubmit={handlePasswordSubmit}>
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
        </form>
      </ModalDialog>

      <ModalDialog
        open={isVerificationModalOpen}
        title={t("settings.verificationTitle")}
        description={t("settings.verificationBody")}
        onClose={() => {
          if (!verifyEmailMutation.isPending && !sendVerificationMutation.isPending) {
            setIsVerificationModalOpen(false);
          }
        }}
        actions={(
          <>
            <button
              className="workspace-shell-trigger"
              disabled={verifyEmailMutation.isPending || sendVerificationMutation.isPending}
              onClick={() => setIsVerificationModalOpen(false)}
              type="button"
            >
              {t("common.dismiss")}
            </button>
            <button
              className="workspace-shell-trigger"
              disabled={sendVerificationMutation.isPending || profile?.isEmailVerified}
              onClick={() => sendVerificationMutation.mutate()}
              type="button"
            >
              {sendVerificationMutation.isPending ? <LoadingSpinner /> : null}
              {t("settings.sendVerificationAction")}
            </button>
            <button
              className="landing-contact-button min-w-0"
              disabled={verifyEmailMutation.isPending || profile?.isEmailVerified}
              form="verify-email-form"
              type="submit"
            >
              {verifyEmailMutation.isPending ? <LoadingSpinner /> : null}
              {t("settings.verifyEmailAction")}
            </button>
          </>
        )}
      >
        <form id="verify-email-form" className="space-y-4" onSubmit={handleVerifyEmailSubmit}>
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
                if (verificationSuccess) {
                  setVerificationSuccess(null);
                }
              }}
            />
          </label>

          {verificationError ? <InlineMessage tone="error">{verificationError}</InlineMessage> : null}
          {verificationSuccess ? <InlineMessage tone="success">{verificationSuccess}</InlineMessage> : null}
        </form>
      </ModalDialog>
    </div>
  );
}
