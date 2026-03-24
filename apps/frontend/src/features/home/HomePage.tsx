import { Link } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { AppFooter } from "@/shared/ui/AppFooter";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { ArrowsIcon, ReceiptIcon, SparklesIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { PageHeading, SectionCard } from "@/shared/ui/primitives";

export function HomePage() {
  const { t } = useI18n();

  const highlights = [
    {
      icon: <WalletIcon className="h-5 w-5" />,
      title: t("landing.highlightValueTitle"),
      body: t("landing.highlightValueBody")
    },
    {
      icon: <ReceiptIcon className="h-5 w-5" />,
      title: t("landing.highlightFeatureTitle"),
      body: t("landing.highlightFeatureBody")
    },
    {
      icon: <ArrowsIcon className="h-5 w-5" />,
      title: t("landing.highlightSettlementTitle"),
      body: t("landing.highlightSettlementBody")
    }
  ];

  const flow = [
    { index: "01", title: t("landing.stepCreateGroupTitle"), body: t("landing.stepCreateGroupBody") },
    { index: "02", title: t("landing.stepAddMembersTitle"), body: t("landing.stepAddMembersBody") },
    { index: "03", title: t("landing.stepAddBillTitle"), body: t("landing.stepAddBillBody") },
    { index: "04", title: t("landing.stepSettleShareTitle"), body: t("landing.stepSettleShareBody") },
    { index: "05", title: t("landing.stepWaitPaymentTitle"), body: t("landing.stepWaitPaymentBody") }
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="card px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-11 w-11 shrink-0" />
              <div>
                <div className="text-lg font-semibold tracking-tight text-ink">{t("app.title")}</div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted">{t("app.kicker")}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link className="button-secondary" to="/auth">
                {t("auth.login")}
              </Link>
              <Link className="button-primary" to="/auth?mode=register">
                {t("auth.register")}
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 py-6">
          <div className="space-y-6">
            <SectionCard className="overflow-hidden p-6 md:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.18fr,0.82fr] lg:items-start">
                <div>
                  <PageHeading
                    eyebrow={t("landing.eyebrow")}
                    title={t("landing.title")}
                    description={t("landing.body")}
                    actions={(
                      <div className="flex flex-wrap gap-2">
                        <Link className="button-primary" to="/auth?mode=register">
                          {t("landing.primaryAction")}
                        </Link>
                        <Link className="button-secondary" to="/auth">
                          {t("landing.secondaryAction")}
                        </Link>
                      </div>
                    )}
                  />

                  <div className="mt-8 grid gap-3 md:grid-cols-3">
                    {highlights.map((item) => (
                      <article key={item.title} className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-soft">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-brand">
                          {item.icon}
                        </span>
                        <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">{item.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="surface-muted p-5 md:p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <SparklesIcon className="h-4 w-4 text-brand" />
                    {t("landing.sideTitle")}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{t("landing.sideBody")}</p>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-[22px] border border-white/80 bg-white/88 p-4 shadow-soft">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                          <UsersIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-ink">{t("landing.sideCardMembersTitle")}</div>
                          <div className="mt-1 text-sm text-muted">{t("landing.sideCardMembersBody")}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/80 bg-white/88 p-4 shadow-soft">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint/70 text-success">
                          <ArrowsIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-ink">{t("landing.sideCardSettlementTitle")}</div>
                          <div className="mt-1 text-sm text-muted">{t("landing.sideCardSettlementBody")}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="p-6 md:p-8">
              <PageHeading
                eyebrow={t("landing.flowEyebrow")}
                title={t("landing.flowTitle")}
                description={t("landing.flowBody")}
              />

              <div className="mt-6 grid gap-3 lg:grid-cols-5">
                {flow.map((step) => (
                  <article key={step.index} className="rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-soft">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{step.index}</div>
                    <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">{step.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="p-6 md:p-8">
              <div className="grid gap-5 lg:grid-cols-[1fr,auto] lg:items-center">
                <div>
                  <span className="eyebrow">{t("landing.ctaEyebrow")}</span>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{t("landing.ctaTitle")}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{t("landing.ctaBody")}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link className="button-primary" to="/auth?mode=register">
                    {t("auth.register")}
                  </Link>
                  <Link className="button-secondary" to="/auth">
                    {t("auth.login")}
                  </Link>
                </div>
              </div>
            </SectionCard>
          </div>
        </main>

        <AppFooter />
      </div>
    </div>
  );
}
