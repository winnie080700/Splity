"use client";

import {
  CreditCard,
  Globe2,
  LockKeyhole,
  LogOut,
  Settings,
  Trash2,
  UserRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { PendingActionButton } from "@/components/ui/pending-action-button";
import { signOut } from "@/lib/auth/actions";
import { useTranslation, type MessageKey } from "@/lib/i18n";
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
  labelKey: MessageKey;
}[] = [
  { icon: UserRound, id: "account", labelKey: "settings.accountTab" },
  { icon: CreditCard, id: "payment", labelKey: "settings.paymentTab" },
  { icon: Settings, id: "general", labelKey: "settings.generalTab" },
];

function SettingsTabs({
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
      className="splity-scrollbar-none flex gap-8 overflow-x-auto border-b border-[var(--splity-line)]"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;

        return (
          <button
            aria-selected={active}
            className={[
              "flex h-14 shrink-0 items-center gap-3 border-b-2 px-3 text-sm font-bold transition",
              active
                ? "border-[#087f6f] text-[#087f6f]"
                : "border-transparent text-[var(--splity-muted)] hover:text-[var(--splity-ink)]",
            ].join(" ")}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            <Icon className="h-4 w-4" />
            {t(tab.labelKey)}
          </button>
        );
      })}
    </nav>
  );
}

function SectionCard({
  body,
  children,
  icon,
  tone = "mint",
  title,
}: {
  body: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  tone?: "mint" | "danger";
  title: ReactNode;
}) {
  const danger = tone === "danger";

  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border bg-white shadow-[0_10px_30px_rgba(12,21,56,0.05)]",
        danger ? "border-red-200 bg-red-50/30" : "border-[var(--splity-line)]",
      ].join(" ")}
    >
      <header
        className={[
          "flex items-center gap-4 px-5 py-5 sm:px-7",
          danger ? "" : "border-b border-[var(--splity-line)]",
        ].join(" ")}
      >
        <span
          className={[
            "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
            danger ? "bg-red-100 text-red-500" : "bg-emerald-50 text-[#087f6f]",
          ].join(" ")}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2
            className={[
              "splity-display text-xl font-extrabold tracking-tight",
              danger ? "text-red-500" : "text-[var(--splity-ink)]",
            ].join(" ")}
          >
            {title}
          </h2>
          <p className="mt-1 text-sm leading-5 text-[var(--splity-muted)]">{body}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function LanguageSegment() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="inline-flex rounded-xl border border-[var(--splity-line)] bg-white p-1">
      {[
        ["en", t("common.english")],
        ["zh", t("common.chinese")],
      ].map(([value, label]) => {
        const active = locale === value;

        return (
          <button
            className={[
              "h-10 min-w-24 rounded-lg px-4 text-sm font-bold transition",
              active
                ? "bg-[#087f6f] text-white shadow-[0_8px_18px_rgba(8,127,111,0.20)]"
                : "text-[var(--splity-ink)] hover:bg-[var(--splity-bg)]",
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
  icon,
  label,
  value,
  hint,
}: {
  action?: ReactNode;
  hint: ReactNode;
  icon: ReactNode;
  label: ReactNode;
  value?: ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-[var(--splity-line)] px-5 py-5 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-7">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#087f6f]">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-extrabold text-[var(--splity-ink)]">{label}</h3>
        <p className="mt-1 text-sm leading-5 text-[var(--splity-muted)]">{hint}</p>
      </div>
      <div className="flex items-center justify-start gap-3 sm:justify-end">
        {value ? <div className="text-sm font-extrabold text-[var(--splity-ink)]">{value}</div> : null}
        {action}
      </div>
    </div>
  );
}

function GeneralPanel() {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:gap-6">
      <SectionCard
        body={t("settings.generalPanelBody")}
        icon={<Settings className="h-5 w-5" />}
        title={t("settings.generalPanelTitle")}
      >
        <div className="m-5 overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white sm:m-7">
          <PreferenceRow
            action={<LanguageSegment />}
            hint={t("settings.languageHint")}
            icon={<Globe2 className="h-5 w-5" />}
            label={t("common.language")}
          />
          <PreferenceRow
            hint={t("settings.currencyHint")}
            icon={<CreditCard className="h-5 w-5" />}
            label={t("settings.currency")}
            value={t("settings.currencyValue")}
          />
        </div>

        <div className="px-5 pb-5 sm:px-7 sm:pb-7">
          <section className="flex flex-col gap-5 rounded-2xl border border-red-200 bg-red-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">
                <Trash2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-red-500">{t("settings.dangerZone")}</h3>
                <p className="mt-1 text-sm leading-5 text-[var(--splity-muted)]">{t("settings.dangerBody")}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3 sm:justify-end">
              <button
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-red-400 bg-white px-5 text-sm font-bold text-red-500 transition disabled:cursor-not-allowed disabled:opacity-60"
                disabled
                title={t("settings.deleteUnavailable")}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                {t("settings.deleteAccount")}
              </button>
              <form action={signOut}>
                <PendingActionButton
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800"
                  pendingLabel={t("settings.signingOut")}
                  pendingToastKey="settings.signingOut"
                  type="submit"
                >
                  <LogOut className="h-4 w-4" />
                  {t("settings.logOut")}
                </PendingActionButton>
              </form>
            </div>
          </section>
        </div>
      </SectionCard>
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
  const { t } = useTranslation();

  return (
    <div className="grid gap-6">
      <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="splity-page-enter grid gap-4 sm:gap-6" key={activeTab} role="tabpanel">
        {activeTab === "account" ? (
          <>
            <ProfileForm name={name} username={username} />

            <SectionCard
              body={t("settings.loginSecurityBody")}
              icon={<LockKeyhole className="h-5 w-5" />}
              title={t("settings.loginSecurityTitle")}
            >
              <div className="divide-y divide-[var(--splity-line)]">
                <EmailSection email={email} isVerified={isEmailVerified} />
                <ChangePasswordForm />
              </div>
            </SectionCard>
          </>
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
      </div>
    </div>
  );
}
