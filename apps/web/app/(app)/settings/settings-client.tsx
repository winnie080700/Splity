"use client";

import { CreditCard, LogOut, Settings, Trash2, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { PendingActionButton } from "@/components/ui/pending-action-button";
import { signOut } from "@/lib/auth/actions";
import { useTranslation } from "@/lib/i18n";
import { ChangePasswordForm } from "./change-password-form";
import { EmailSection } from "./email-section";
import { PaymentProfileForm } from "./payment-profile-form";
import { ProfileForm } from "./profile-form";

type SettingsClientProps = {
  accountName: string;
  accountNumber: string;
  email: string;
  isEmailVerified: boolean;
  name: string;
  notes: string;
  payeeName: string;
  paymentMethod: string;
  paymentQrDataUrl: string;
  username: string;
};

type TabId = "account" | "payment" | "general";

const tabs: {
  icon: typeof UserRound;
  id: TabId;
  bodyKey: "settings.accountBody" | "settings.paymentBodyNew" | "settings.generalBody";
  kickerKey: "settings.accountKicker" | "settings.paymentKicker" | "settings.generalKicker";
  labelKey: "settings.accountTab" | "settings.paymentTab" | "settings.generalTab";
  titleKey: "settings.accountPanelTitle" | "settings.paymentPanelTitle" | "settings.generalPanelTitle";
}[] = [
  {
    bodyKey: "settings.accountBody",
    icon: UserRound,
    id: "account",
    kickerKey: "settings.accountKicker",
    labelKey: "settings.accountTab",
    titleKey: "settings.accountPanelTitle",
  },
  {
    bodyKey: "settings.paymentBodyNew",
    icon: CreditCard,
    id: "payment",
    kickerKey: "settings.paymentKicker",
    labelKey: "settings.paymentTab",
    titleKey: "settings.paymentPanelTitle",
  },
  {
    bodyKey: "settings.generalBody",
    icon: Settings,
    id: "general",
    kickerKey: "settings.generalKicker",
    labelKey: "settings.generalTab",
    titleKey: "settings.generalPanelTitle",
  },
];

function SettingsNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("settings.sectionsLabel")}
      className="grid h-fit gap-2 rounded-[14px] border border-[var(--splity-line)] bg-white p-2 shadow-sm lg:sticky lg:top-6"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;

        return (
          <button
            aria-current={active ? "page" : undefined}
            className={[
              "inline-flex h-11 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm font-bold transition",
              active
                ? "border-[var(--splity-ink)] bg-[var(--splity-navy)] text-white shadow-[0_8px_18px_rgba(27,42,107,0.18)]"
                : "border-[var(--splity-ink)] bg-[#fbfaf5] text-[var(--splity-ink)] hover:bg-white",
            ].join(" ")}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <Icon
              aria-hidden="true"
              className={[
                "h-4 w-4 shrink-0",
                active ? "text-[var(--splity-gold)]" : "text-[var(--splity-muted)]",
              ].join(" ")}
            />
            {t(tab.labelKey)}
          </button>
        );
      })}
    </nav>
  );
}

function LanguageSegment() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="inline-flex rounded-full border border-[var(--splity-line)] bg-white p-1">
      {[
        ["en", t("common.englishShort")],
        ["zh", t("common.chinese")],
      ].map(([value, label]) => {
        const active = locale === value;

        return (
          <button
            className={[
              "h-8 rounded-full px-4 text-xs font-bold transition",
              active
                ? "bg-[var(--splity-navy)] text-white shadow-sm"
                : "text-[var(--splity-muted)] hover:text-[var(--splity-ink)]",
            ].join(" ")}
            key={value}
            onClick={() => setLocale(value as "en" | "zh")}
            type="button"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PreferenceRow({
  action,
  children,
  label,
}: {
  action?: ReactNode;
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid min-h-[70px] gap-3 rounded-xl border border-[var(--splity-line)] bg-[#fffefa] px-4 py-4 sm:grid-cols-[minmax(150px,0.22fr)_1fr_auto] sm:items-center">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--splity-gold-strong)]">
          {label}
        </p>
      </div>
      <div className="text-sm font-bold text-[var(--splity-ink)]">{children}</div>
      {action ? <div className="justify-self-start sm:justify-self-end">{action}</div> : null}
    </div>
  );
}

function GeneralPanel() {
  const { locale, t } = useTranslation();

  return (
    <div className="grid gap-4">
      <PreferenceRow action={<LanguageSegment />} label={t("settings.currentLanguage")}>
        {locale === "zh" ? t("common.chinese") : t("common.english")}
      </PreferenceRow>

      <PreferenceRow
        action={
          <button
            className="rounded-md border border-[var(--splity-line-strong)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--splity-ink)] transition hover:bg-[#f7f5ee]"
            type="button"
          >
            {t("common.change")}
          </button>
        }
        label={t("settings.currency")}
      >
        {t("settings.currencyValue")}
      </PreferenceRow>

      <PreferenceRow
        action={
          <button
            className="rounded-md border border-[var(--splity-line-strong)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--splity-ink)] transition hover:bg-[#f7f5ee]"
            type="button"
          >
            {t("settings.configure")}
          </button>
        }
        label={t("settings.emailReminders")}
      >
        {t("settings.emailRemindersValue")}
      </PreferenceRow>

      <div className="mt-2 grid gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h3 className="text-sm font-extrabold text-red-600">{t("settings.dangerTitle")}</h3>
          <p className="mt-2 max-w-lg text-xs leading-5 text-[var(--splity-muted)]">
            {t("settings.dangerBody")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 bg-white px-5 text-sm font-bold text-red-600 opacity-60"
            disabled
            title={t("settings.deleteUnavailable")}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            {t("settings.deleteAccount")}
          </button>
          <form action={signOut}>
            <PendingActionButton
              className="inline-flex h-10 items-center gap-2 rounded-full bg-red-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-red-600"
              pendingLabel={t("settings.signingOut")}
              pendingToastKey="settings.signingOut"
              type="submit"
            >
              <LogOut className="h-4 w-4" />
              {t("settings.logOut")}
            </PendingActionButton>
          </form>
        </div>
      </div>
    </div>
  );
}

export function SettingsClient({
  accountName,
  accountNumber,
  email,
  isEmailVerified,
  name,
  notes,
  payeeName,
  paymentMethod,
  paymentQrDataUrl,
  username,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const { t } = useTranslation();
  const profileFormId = "settings-profile-form";

  return (
    <div className="grid gap-8">
      <header className="pt-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.32em] text-[var(--splity-gold-strong)] before:mr-2 before:content-['•']">
          {t("settings.title")}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[var(--splity-ink)] sm:text-5xl">
          {t("settings.headingPrefix")}{" "}
          <span className="font-[var(--splity-serif)] text-[1.08em] italic text-[var(--splity-navy)]">
            {t("settings.headingAccent")}
          </span>
        </h1>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SettingsNav activeTab={activeTab} setActiveTab={setActiveTab} />

        <section className="min-h-[560px] rounded-[24px] bg-white p-5 shadow-[0_16px_45px_rgba(12,21,56,0.08)] ring-1 ring-[var(--splity-line)] sm:p-8">
          <div className="mb-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.26em] text-[var(--splity-gold-strong)]">
              {t(active.kickerKey)}
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--splity-ink)] sm:text-3xl">
              {t(active.titleKey)}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--splity-muted)]">{t(active.bodyKey)}</p>
          </div>

          {activeTab === "account" ? (
            <div className="grid gap-4">
              <ProfileForm formId={profileFormId} name={name} username={username} />
              <EmailSection email={email} isVerified={isEmailVerified} />
              <ChangePasswordForm />
            </div>
          ) : null}

          {activeTab === "payment" ? (
            <PaymentProfileForm
              accountName={accountName}
              accountNumber={accountNumber}
              notes={notes}
              payeeName={payeeName}
              paymentMethod={paymentMethod}
              paymentQrDataUrl={paymentQrDataUrl}
            />
          ) : null}

          {activeTab === "general" ? <GeneralPanel /> : null}
        </section>
      </div>
    </div>
  );
}
