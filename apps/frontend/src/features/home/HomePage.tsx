import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ArrowsIcon, ReceiptIcon, SparklesIcon, WalletIcon } from "@/shared/ui/icons";
import { PublicSiteFooter } from "@/shared/ui/PublicSiteFooter";
import { PublicSiteHeader } from "@/shared/ui/PublicSiteHeader";

type LandingFeature = {
  icon: ReactNode;
  title: string;
  body: string;
};

type LandingStep = {
  index: string;
  title: string;
  body: string;
};

export function HomePage() {
  const { t } = useI18n();

  const navItems = [
    { href: "#why-splity", label: t("landing.navWhy") },
    { href: "#how-it-works", label: t("landing.navHow") },
    { href: "#contact", label: t("landing.navContact") }
  ];

  const features: LandingFeature[] = [
    {
      icon: <ReceiptIcon className="h-4 w-4" />,
      title: t("landing.featureTrackTitle"),
      body: t("landing.featureTrackBody")
    },
    {
      icon: <WalletIcon className="h-4 w-4" />,
      title: t("landing.featureSettlementTitle"),
      body: t("landing.featureSettlementBody")
    },
    {
      icon: <ArrowsIcon className="h-4 w-4" />,
      title: t("landing.featureShareTitle"),
      body: t("landing.featureShareBody")
    },
    {
      icon: <SparklesIcon className="h-4 w-4" />,
      title: t("landing.featurePaymentTitle"),
      body: t("landing.featurePaymentBody")
    }
  ];

  const steps: LandingStep[] = [
    { index: "01", title: t("landing.stepCreateGroupTitle"), body: t("landing.stepCreateGroupBody") },
    { index: "02", title: t("landing.stepAddMembersTitle"), body: t("landing.stepAddMembersBody") },
    { index: "03", title: t("landing.stepAddBillTitle"), body: t("landing.stepAddBillBody") },
    { index: "04", title: t("landing.stepSettleShareTitle"), body: t("landing.stepSettleShareBody") },
    { index: "05", title: t("landing.stepWaitPaymentTitle"), body: t("landing.stepWaitPaymentBody") }
  ];
  const heroPreviewSrc = "/landing-dashboard-hero.png";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(202,138,4,0.08),transparent_22%),radial-gradient(circle_at_top_right,rgba(30,58,138,0.08),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] text-[#0f172a]">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-6 sm:py-5 lg:px-10">
        <PublicSiteHeader
          navItems={navItems}
          cta={{ label: t("landing.tryNow"), to: "/auth?mode=register" }}
        />

        <main className="pb-8 pt-4 sm:pt-6 lg:pt-8">
          <section className="text-center">
            <h1 className="landing-display landing-fade-up mx-auto max-w-[5.6ch] text-[clamp(2.6rem,15vw,7.35rem)] leading-[0.84] text-[#0f172a] sm:max-w-[6.4ch] sm:leading-[0.8] lg:max-w-none" style={{ animationDelay: "120ms" }}>
              {t("landing.heroTitle")}
            </h1>

            <div className="mx-auto mt-8 flex max-w-[1080px] justify-center sm:mt-10 lg:mt-12">
              <div className="landing-scale-in relative h-[150px] w-[202px] sm:h-[270px] sm:w-full lg:h-[340px]" aria-label={t("landing.heroFrameLabel")} style={{ animationDelay: "220ms" }}>
                <div className="absolute inset-x-0 bottom-0 h-[104px] rounded-[14px] bg-[linear-gradient(180deg,rgba(202,138,4,0.74),rgba(234,179,8,0.7))] sm:h-[180px] sm:rounded-[18px] lg:h-[208px]" />
                <div className="absolute bottom-[12px] left-1/2 h-[136px] w-[124px] -translate-x-1/2 overflow-hidden rounded-[14px] border border-slate-200/70 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.18)] sm:bottom-[18px] sm:h-[206px] sm:w-[84%] sm:rounded-[20px] lg:h-[260px] lg:w-[78%]">
                  <img
                    src={heroPreviewSrc}
                    alt={t("landing.heroFrameLabel")}
                    className="h-full w-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </section>

          <section id="why-splity" className="landing-fade-up mt-14 sm:mt-16 lg:mt-20" style={{ animationDelay: "320ms" }}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700/80">
              {t("landing.sectionLabel")}
            </div>

            <div className="mt-4 max-w-[720px]">
              <h2 className="landing-display text-[clamp(2rem,9vw,3.85rem)] leading-[0.92] text-[#0f172a]">
                {t("landing.calculationTitle")}
              </h2>
              <p className="mt-4 max-w-[620px] text-[13px] leading-6 text-[#475569] sm:text-[14px]">
                {t("landing.calculationBody")}
              </p>
            </div>

            <div className="mt-8 grid gap-x-8 gap-y-6 border-t border-slate-200/90 pt-6 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <article key={feature.title} className="landing-fade-up min-w-0" style={{ animationDelay: `${380 + index * 80}ms` }}>
                  <div className="flex items-center gap-2 text-[#1e3a8a]">
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 text-[13px] font-semibold text-[#0f172a] sm:text-[14px]">{feature.title}</h3>
                  <p className="mt-3 max-w-[250px] text-[12px] leading-5 text-[#475569] sm:text-[12.5px]">
                    {feature.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section id="how-it-works" className="mt-16 lg:mt-24">
            <div className="landing-fade-up" style={{ animationDelay: "540ms" }}>
              <h2 className="landing-display text-[clamp(2.1rem,9.5vw,4.1rem)] leading-[0.9] text-[#0f172a]">
                {t("landing.workflowTitle")}
              </h2>
              <p className="mt-4 max-w-[560px] text-[13px] leading-6 text-[#475569] sm:text-[14px]">
                {t("landing.workflowBody")}
              </p>

              <div className="mt-8 border-t border-slate-200/90 pt-4">
                <div className="overflow-x-auto pb-2">
                  <div className="flex min-w-[1080px] items-stretch gap-3">
                    {steps.map((step, index) => (
                      <div key={step.index} className="flex items-stretch gap-3">
                        <article
                          className="landing-fade-up w-[204px] rounded-[20px] border border-slate-200/90 bg-white/90 p-4"
                          style={{ animationDelay: `${620 + index * 80}ms` }}
                        >
                          <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-amber-300/80 bg-amber-50 px-3 text-[10px] font-semibold tracking-[0.14em] text-amber-700/90">
                            {step.index}
                          </div>
                          <h3 className="mt-3 text-[13px] font-semibold text-[#0f172a]">{step.title}</h3>
                          <p className="mt-2 text-[12px] leading-6 text-[#475569]">
                            {step.body}
                          </p>
                        </article>
                        {index < steps.length - 1 ? (
                          <div
                            className="landing-fade-up flex items-center text-[18px] font-semibold text-[#1e3a8a]"
                            style={{ animationDelay: `${660 + index * 80}ms` }}
                            aria-hidden="true"
                          >
                            →
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Link className="landing-olive-button mt-6" to="/auth?mode=register">
                {t("landing.workflowCta")}
              </Link>
            </div>
          </section>

          <section id="contact" className="landing-fade-up mt-20 pb-8 pt-2 text-center sm:mt-24 lg:mt-28" style={{ animationDelay: "780ms" }}>
            <h2 className="landing-display mx-auto text-[clamp(2.2rem,10vw,4.45rem)] leading-[0.88] text-[#0f172a]">
              {t("landing.improveTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-[460px] text-[13px] leading-6 text-[#475569] sm:text-[14px]">
              {t("landing.improveBody")}
            </p>
            <a
              className="landing-contact-button mt-6"
              href="https://github.com/winnie080700/Splity"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("landing.improveAction")}
            </a>          
            </section>
        </main>

        <PublicSiteFooter
          links={[
            { href: "#why-splity", label: t("landing.navWhy") },
            { href: "#contact", label: t("landing.navContact") }
          ]}
        />
      </div>
    </div>
  );
}
