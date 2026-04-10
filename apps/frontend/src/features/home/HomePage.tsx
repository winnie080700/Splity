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

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#161616]">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-6 sm:py-5 lg:px-10">
        <PublicSiteHeader
          navItems={navItems}
          cta={{ label: t("landing.tryNow"), to: "/auth?mode=register" }}
        />

        <main className="pb-8 pt-4 sm:pt-6 lg:pt-8">
          <section className="text-center">
            <h1 className="landing-display landing-fade-up mx-auto max-w-[5ch] text-[4.15rem] leading-[0.8] text-[#161616] sm:max-w-[6.4ch] sm:text-[6.2rem] lg:max-w-none lg:text-[7.35rem]" style={{ animationDelay: "120ms" }}>
              {t("landing.heroTitle")}
            </h1>

            <div className="mx-auto mt-8 flex max-w-[1080px] justify-center sm:mt-10 lg:mt-12">
              <div className="landing-scale-in relative h-[150px] w-[202px] sm:h-[270px] sm:w-full lg:h-[340px]" aria-label={t("landing.heroFrameLabel")} style={{ animationDelay: "220ms" }}>
                <div className="absolute inset-x-0 bottom-0 h-[104px] rounded-[14px] bg-[#afbe93] sm:h-[180px] sm:rounded-[18px] lg:h-[208px]" />
                <div className="absolute bottom-[12px] left-1/2 h-[136px] w-[124px] -translate-x-1/2 rounded-[14px] bg-black shadow-[0_20px_40px_rgba(0,0,0,0.18)] sm:bottom-[18px] sm:h-[206px] sm:w-[84%] sm:rounded-[20px] lg:h-[260px] lg:w-[78%]" />
              </div>
            </div>
          </section>

          <section id="why-splity" className="landing-fade-up mt-14 sm:mt-16 lg:mt-20" style={{ animationDelay: "320ms" }}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b0a997]">
              {t("landing.sectionLabel")}
            </div>

            <div className="mt-4 max-w-[720px]">
              <h2 className="landing-display text-[3rem] leading-[0.9] text-[#1c1a17] sm:text-[3.85rem]">
                {t("landing.calculationTitle")}
              </h2>
              <p className="mt-4 max-w-[620px] text-[13px] leading-6 text-[#8a8478] sm:text-[14px]">
                {t("landing.calculationBody")}
              </p>
            </div>

            <div className="mt-8 grid gap-x-8 gap-y-6 border-t border-[#e5dfd2] pt-6 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <article key={feature.title} className="landing-fade-up min-w-0" style={{ animationDelay: `${380 + index * 80}ms` }}>
                  <div className="flex items-center gap-2 text-[#171511]">
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 text-[13px] font-semibold text-[#26231d] sm:text-[14px]">{feature.title}</h3>
                  <p className="mt-3 max-w-[250px] text-[12px] leading-5 text-[#8c8679] sm:text-[12.5px]">
                    {feature.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section id="how-it-works" className="mt-16 grid gap-10 lg:mt-24 lg:grid-cols-[1.04fr,0.96fr] lg:items-center">
            <div className="landing-fade-up" style={{ animationDelay: "540ms" }}>
              <h2 className="landing-display text-[3.2rem] leading-[0.88] text-[#1d1b17] sm:text-[4.1rem]">
                {t("landing.workflowTitle")}
              </h2>
              <p className="mt-4 max-w-[560px] text-[13px] leading-6 text-[#8a8478] sm:text-[14px]">
                {t("landing.workflowBody")}
              </p>

              <div className="mt-8 border-t border-[#e5dfd2]">
                {steps.map((step, index) => (
                  <article
                    key={step.index}
                    className={index === 0 ? "landing-fade-up grid grid-cols-[32px,1fr] gap-3 py-4" : "landing-fade-up grid grid-cols-[32px,1fr] gap-3 border-t border-[#ece6d8] py-4"}
                    style={{ animationDelay: `${620 + index * 80}ms` }}
                  >
                    <div className="pt-0.5 text-[10px] font-semibold tracking-[0.14em] text-[#8d8575]">
                      {step.index}
                    </div>
                    <div>
                      <h3 className="text-[12px] font-semibold text-[#1f1c16] sm:text-[13px]">{step.title}</h3>
                      <p className="mt-2 max-w-[520px] text-[12px] leading-5 text-[#8a8478] sm:text-[13px]">
                        {step.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <Link className="landing-olive-button mt-6" to="/auth?mode=register">
                {t("landing.workflowCta")}
              </Link>
            </div>

            <div className="landing-fade-up hidden lg:block" style={{ animationDelay: "700ms" }}>
              <div className="landing-visual-panel relative overflow-hidden rounded-[20px] bg-[#d9c7a1] p-10 shadow-[0_26px_60px_rgba(66,52,22,0.12)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.26),transparent_34%)]" />
                <div className="relative flex h-[420px] items-end justify-center gap-4">
                  <div className="w-20 rounded-[18px] bg-[linear-gradient(180deg,#f5efe6_0%,#d7ccb9_100%)] shadow-[0_22px_38px_rgba(108,90,55,0.14)]" style={{ height: "112px" }} />
                  <div className="w-24 rounded-[18px] bg-[linear-gradient(180deg,#f5efe6_0%,#d7ccb9_100%)] shadow-[0_22px_38px_rgba(108,90,55,0.14)]" style={{ height: "208px" }} />
                  <div className="w-24 rounded-[18px] bg-[linear-gradient(180deg,#f5efe6_0%,#d7ccb9_100%)] shadow-[0_22px_38px_rgba(108,90,55,0.14)]" style={{ height: "168px" }} />
                  <div className="w-20 rounded-[18px] bg-[linear-gradient(180deg,#f5efe6_0%,#d7ccb9_100%)] shadow-[0_22px_38px_rgba(108,90,55,0.14)]" style={{ height: "84px" }} />
                </div>
              </div>
            </div>
          </section>

          <section id="contact" className="landing-fade-up mt-20 pb-8 pt-2 text-center sm:mt-24 lg:mt-28" style={{ animationDelay: "780ms" }}>
            <h2 className="landing-display mx-auto text-[3.4rem] leading-[0.86] text-[#1d1a16] sm:text-[4.45rem]">
              {t("landing.improveTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-[460px] text-[13px] leading-6 text-[#8a8478] sm:text-[14px]">
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
