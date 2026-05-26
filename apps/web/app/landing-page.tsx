"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { useTranslation, type Locale } from "@/lib/i18n";
import {
  ActivityIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  CheckIcon,
  CircleAlertIcon,
  CirclePlayIcon,
  HandCoinsIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MailIcon,
  ReceiptTextIcon,
  SettingsIcon,
  Share2Icon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

type Feature = {
  title: string;
  body: string;
};

type UseCase = {
  title: string;
  body: string;
  tag: string;
  tone: string;
};

type Step = {
  title: string;
  body: string;
};

type FooterColumn = {
  heading: string;
  links: { label: string; href: string }[];
};

const navIds = ["#why", "#how", "#cases", "#contact"] as const;

function useLandingCopy() {
  const { locale, t } = useTranslation();

  return {
    locale,
    nav: [
      t("landing.nav.why"),
      t("landing.nav.how"),
      t("landing.nav.cases"),
      t("landing.nav.contact"),
    ],
    tryNow: t("landing.tryNow"),
    free: t("landing.free"),
    heroA: t("landing.heroA"),
    heroB: t("landing.heroB"),
    heroC: t("landing.heroC"),
    heroBody: t("landing.heroBody"),
    primary: t("landing.primary"),
    secondary: t("landing.secondary"),
    byline: t("landing.byline"),
    calcA: t("landing.calcA"),
    calcB: t("landing.calcB"),
    calcBody: t("landing.calcBody"),
    features: [
      { title: t("landing.feature.1.title"), body: t("landing.feature.1.body") },
      { title: t("landing.feature.2.title"), body: t("landing.feature.2.body") },
      { title: t("landing.feature.3.title"), body: t("landing.feature.3.body") },
      { title: t("landing.feature.4.title"), body: t("landing.feature.4.body") },
      { title: t("landing.feature.5.title"), body: t("landing.feature.5.body") },
    ],
    casesKicker: t("landing.casesKicker"),
    casesTitleA: t("landing.casesTitleA"),
    casesTitleB: t("landing.casesTitleB"),
    casesBody: t("landing.casesBody"),
    useCases: [
      {
        title: t("landing.useCase.1.title"),
        body: t("landing.useCase.1.body"),
        tag: t("landing.useCase.1.tag"),
        tone: "bg-violet-50 text-violet-700",
      },
      {
        title: t("landing.useCase.2.title"),
        body: t("landing.useCase.2.body"),
        tag: t("landing.useCase.2.tag"),
        tone: "bg-emerald-50 text-emerald-700",
      },
      {
        title: t("landing.useCase.3.title"),
        body: t("landing.useCase.3.body"),
        tag: t("landing.useCase.3.tag"),
        tone: "bg-orange-50 text-orange-700",
      },
      {
        title: t("landing.useCase.4.title"),
        body: t("landing.useCase.4.body"),
        tag: t("landing.useCase.4.tag"),
        tone: "bg-rose-50 text-rose-700",
      },
    ],
    stepsKicker: t("landing.stepsKicker"),
    stepsTitleA: t("landing.stepsTitleA"),
    stepsTitleB: t("landing.stepsTitleB"),
    stepsBody: t("landing.stepsBody"),
    steps: [
      { title: t("landing.step.1.title"), body: t("landing.step.1.body") },
      { title: t("landing.step.2.title"), body: t("landing.step.2.body") },
      { title: t("landing.step.3.title"), body: t("landing.step.3.body") },
      { title: t("landing.step.4.title"), body: t("landing.step.4.body") },
      { title: t("landing.step.5.title"), body: t("landing.step.5.body") },
    ],
    metrics: [
      [t("landing.metric.1.value"), t("landing.metric.1.label")],
      [t("landing.metric.2.value"), t("landing.metric.2.label")],
      [t("landing.metric.3.value"), t("landing.metric.3.label")],
      [t("landing.metric.4.value"), t("landing.metric.4.label")],
    ] as [string, string][],
    finalKicker: t("landing.finalKicker"),
    finalTitleA: t("landing.finalTitleA"),
    finalTitleB: t("landing.finalTitleB"),
    finalBody: t("landing.finalBody"),
    contact: t("landing.contact"),
    footerBody: t("landing.footerBody"),
    footerProduct: t("landing.footer.product"),
    footerSupport: t("landing.footer.support"),
    footerLegal: t("landing.footer.legal"),
    faq: t("common.faq"),
    privacy: t("common.privacy"),
    terms: t("common.terms"),
  };
}

function isPageLink(href: string) {
  return href.startsWith("/") && !href.startsWith("/#");
}

function Avatar({ children, tone = "bg-[var(--splity-navy)]" }: { children: string; tone?: string }) {
  return (
    <span className={`inline-grid h-6 w-6 place-items-center rounded-full border-2 border-white splity-display text-[10px] text-white ${tone}`}>
      {children}
    </span>
  );
}

function DashboardPreview({ language }: { language: Locale }) {
  const labels = language === "zh"
    ? {
        summary: "摘要",
        greeting: "嘿，Winnie",
        general: "通用",
        support: "支持",
        dashboard: "Dashboard",
        groups: "Groups",
        invitations: "Invitations",
        activity: "Activity",
        settings: "Settings",
        net: "净余额",
        owe: "你应付",
        owed: "应收",
        unsettled: "未结清群组",
        recent: "近期动态",
        track: "追踪最新操作",
        month: "本月",
        year: "今年",
      }
    : {
        summary: "Summary",
        greeting: "Hey, Winnie",
        general: "General",
        support: "Support",
        dashboard: "Dashboard",
        groups: "Groups",
        invitations: "Invitations",
        activity: "Activity",
        settings: "Settings",
        net: "Net balance",
        owe: "You owe",
        owed: "You are owed",
        unsettled: "Unsettled groups",
        recent: "Recent activity",
        track: "Track your latest actions",
        month: "This month",
        year: "This year",
      };

  const activity = [
    ["L", "Leo · Hotpot night", "Weekend Hotpot · today 19:42", "+¥214.00", "Pending", "bg-[#2e8a5e]"],
    ["M", "Mia paid you back", "Direct transfer · yesterday", "+¥240.00", "Paid", "bg-[#c46920]"],
    ["Y", "You · Kyoto stay", "Tokyo Trip · May 12", "+¥1,070.00", "Splitting", "bg-[#1b2a6b]"],
  ] as const;
  const sidebarItems = [
    { label: labels.dashboard, Icon: LayoutDashboardIcon },
    { label: `${labels.groups} 8`, Icon: UsersIcon },
    { label: `${labels.invitations} 2`, Icon: MailIcon },
    { label: labels.activity, Icon: ActivityIcon },
  ];

  return (
    <div className="relative mx-auto mt-20 max-w-[1140px]">
      <div className="absolute -inset-x-2 bottom-12 top-[-38px] z-0 hidden -rotate-1 rounded-[28px] bg-[linear-gradient(135deg,#f0bc3a,#e9b142_60%,#d89426)] shadow-[0_40px_80px_rgba(217,148,38,0.32)] md:block" />

      <div className="absolute -left-5 -top-8 z-20 hidden -rotate-3 items-center gap-3 rounded-2xl border border-[var(--splity-line)] bg-white px-3.5 py-3 shadow-[0_12px_28px_rgba(12,21,56,0.15)] lg:flex">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--splity-mint)] text-sm font-bold text-white">
          <CheckIcon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] text-[var(--splity-muted)]">Mia paid you back</p>
          <p className=" text-sm text-[var(--splity-mint)]">+¥240.00</p>
        </div>
      </div>

      <div className="absolute -bottom-6 right-2 z-20 hidden rotate-3 items-center gap-3 rounded-2xl border border-[var(--splity-line)] bg-white px-3.5 py-3 shadow-[0_12px_28px_rgba(12,21,56,0.15)] lg:flex">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--splity-gold-strong)] text-sm font-bold text-white">
          <CircleAlertIcon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] text-[var(--splity-muted)]">3 unsettled in Tokyo Trip</p>
          <p className="text-sm font-semibold text-[var(--splity-navy)]">Send reminder</p>
        </div>
      </div>

      <div className="relative z-10 overflow-hidden rounded-[22px] bg-white shadow-[0_0_0_1px_rgba(12,21,56,0.06),0_28px_60px_rgba(12,21,56,0.14),0_60px_120px_rgba(12,21,56,0.10)]">
        <div className="grid min-h-[540px] grid-cols-1 md:grid-cols-[220px_1fr]">
          <aside className="hidden flex-col border-r border-[var(--splity-line)] bg-[#faf9f4] p-[22px_18px] text-[13.5px] md:flex">
            <div className="flex items-center gap-2 px-1.5 pb-5 splity-display text-base">
              <BrandMark compact />
              Splity
            </div>
            <div className="px-2 pb-2 pt-3 text-[10.5px] font-semibold uppercase text-[var(--splity-muted)]">{labels.general}</div>
            {sidebarItems.map(({ label, Icon }, index) => (
              <div
                className={`mb-1 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 font-medium ${
                  index === 0 ? "bg-[var(--splity-navy)] text-white" : "text-[var(--splity-ink)]"
                }`}
                key={label}
              >
                <Icon aria-hidden="true" className={index === 0 ? "h-4 w-4 text-[var(--splity-gold)]" : "h-4 w-4 text-[var(--splity-muted)]"} />
                <span>{label}</span>
              </div>
            ))}
            <div className="px-2 pb-2 pt-5 text-[10.5px] font-semibold uppercase text-[var(--splity-muted)]">{labels.support}</div>
            <div className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 font-medium">
              <SettingsIcon aria-hidden="true" className="h-4 w-4 text-[var(--splity-muted)]" />
              <span>{labels.settings}</span>
            </div>
            <div className="mt-auto p-2.5 text-[11px] text-[var(--splity-muted)]">v 2.4 · Online</div>
          </aside>

          <div className="flex flex-col gap-5 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase text-[var(--splity-muted)]">{labels.summary}</p>
                <h2 className="mt-1 splity-display text-[22px]">{labels.greeting}</h2>
              </div>
              <div className="inline-flex rounded-full border border-[var(--splity-line)] bg-[#f2f1ec] p-1 text-[11.5px] font-semibold">
                <span className="rounded-full bg-[var(--splity-navy)] px-3 py-1.5 text-white">{labels.month}</span>
                <span className="px-3 py-1.5 text-[var(--splity-muted)]">{labels.year}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [labels.net, "+486.20", "text-[var(--splity-mint)]", "bg-[#fbfaf5]"],
                [labels.owe, "-214.00", "text-[var(--splity-rose)]", "bg-[#fbfaf5]"],
                [labels.owed, "+700.20", "text-[var(--splity-mint)]", "bg-[#fbfaf5]"],
                [labels.unsettled, "3", "text-[var(--splity-ink)]", "bg-[linear-gradient(180deg,#e9efff,#dde6ff)]"],
              ].map(([title, value, color, bg]) => (
                <div className={`relative overflow-hidden rounded-[14px] border border-[var(--splity-line)] p-4 ${bg}`} key={title}>
                  <p className="text-[10px] font-semibold uppercase text-[var(--splity-muted)]">{title}</p>
                  <p className={`mt-3 splity-display text-[28px] ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-[14px] border border-[var(--splity-line)] bg-[#fbfaf5]">
              <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-[var(--splity-muted)]">{labels.recent}</p>
                  <p className="mt-0.5 splity-display text-[15px]">{labels.track}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--splity-navy)]">
                  View all
                  <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
              </div>
              {activity.map(([initial, title, meta, amount, status, tone]) => (
                <div className="grid grid-cols-[30px_1fr_auto] items-center gap-3 border-t border-[var(--splity-line)] px-4 py-2.5 text-[13px] sm:grid-cols-[30px_1fr_90px_80px]" key={title}>
                  <span className={`grid h-6 w-6 place-items-center rounded-full splity-display text-[11px] text-white ${tone}`}>{initial}</span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-[var(--splity-muted)]">{meta}</p>
                  </div>
                  <p className="hidden text-right text-[13px] text-[var(--splity-mint)] sm:block">{amount}</p>
                  <p className="text-right text-[11px] font-semibold uppercase text-[var(--splity-gold-strong)]">{status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  kicker,
  titleA,
  titleB,
  body,
  centered = false,
}: {
  kicker: string;
  titleA: string;
  titleB: string;
  body: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto mb-12 max-w-[720px] text-center" : "mb-12 grid gap-8 md:grid-cols-2 md:items-end md:gap-[60px]"}>
      <div>
        <p className="text-[11.5px] font-bold uppercase text-[var(--splity-navy)]">{kicker}</p>
        <h2 className="mt-3 splity-display text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.98]">
          {titleA} <span className="italic text-[var(--splity-navy)]">{titleB}</span>
        </h2>
      </div>
      <p className={`text-[15px] leading-7 text-[var(--splity-muted)] sm:text-[17px] ${centered ? "mx-auto mt-4 max-w-[600px]" : "max-w-[600px]"}`}>
        {body}
      </p>
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const title = index + 1;
  const FeatureIcon = [ListChecksIcon, HandCoinsIcon, Share2Icon, BadgeCheckIcon, ReceiptTextIcon][index] ?? ListChecksIcon;

  return (
    <article className={`relative flex min-h-[230px] flex-col gap-2.5 overflow-hidden rounded-[22px] border border-[var(--splity-line)] bg-white p-6 ${index === 0 ? "md:row-span-2" : ""}`}>
      <span className="absolute right-5 top-5 text-[11px] text-[var(--splity-muted)]">0{title}</span>
      <div className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-[#faefce] text-[var(--splity-gold-strong)]">
        <FeatureIcon aria-hidden="true" className="h-5 w-5" />
      </div>
      <h3 className="mt-2 splity-display text-[22px]">{feature.title}</h3>
      <p className="text-[14.5px] leading-6 text-[var(--splity-muted)]">{feature.body}</p>
      <div className={index === 0 ? "mt-4" : "mt-auto pt-3"}>
        {index === 0 ? (
          <div className="flex flex-col gap-2">
            {[
              ["Old Beijing hotpot", "Leo paid · split 4 ways", "+¥214.00", "bg-[#c46920]", "text-[var(--splity-mint)]"],
              ["DiDi to the station", "You paid · 2 of you", "-¥24.00", "bg-[#2e8a5e]", "text-[var(--splity-rose)]"],
              ["Kyoto Airbnb", "You paid · split 5 ways", "+¥1,070.00", "bg-[#6b3ce7]", "text-[var(--splity-mint)]"],
              ["Late snack run", "Mia paid · split 3 ways", "+¥36.00", "bg-[var(--splity-navy)]", "text-[var(--splity-mint)]"],
            ].map(([name, meta, amount, tone, color]) => (
              <div className="grid grid-cols-[30px_1fr_auto] items-center gap-3 rounded-xl border border-[var(--splity-line)] bg-[#fbfaf5] px-3.5 py-2.5 text-[13px]" key={name}>
                <span className={`grid h-[30px] w-[30px] place-items-center rounded-[9px] text-sm font-bold text-white ${tone}`}>{name[0]}</span>
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-[11.5px] text-[var(--splity-muted)]">{meta}</p>
                </div>
                <p className={` text-[13px] ${color}`}>{amount}</p>
              </div>
            ))}
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#f2f1ec] px-3.5 py-3">
                <p className=" text-[11px] uppercase text-[var(--splity-muted)]">Logged</p>
                <p className="mt-1 splity-display text-[22px]">4 bills</p>
              </div>
              <div className="rounded-xl bg-[#f2f1ec] px-3.5 py-3">
                <p className=" text-[11px] uppercase text-[var(--splity-muted)]">Balance</p>
                <p className="mt-1 splity-display text-[22px] text-[var(--splity-mint)]">+¥1.3K</p>
              </div>
            </div>
          </div>
        ) : index === 1 ? (
          <MiniSettlement />
        ) : index === 2 ? (
          <ShareMini />
        ) : index === 3 ? (
          <StatusMini />
        ) : (
          <ReceiptMini />
        )}
      </div>
    </article>
  );
}

function MiniSettlement() {
  return (
    <div className="flex flex-col gap-2">
      {[
        ["M", "Mia", "Y", "You", "¥240", "text-[var(--splity-mint)]"],
        ["L", "Leo", "Y", "You", "¥186", "text-[var(--splity-mint)]"],
        ["Y", "You", "A", "Ada", "¥214", "text-[var(--splity-rose)]"],
      ].map(([from, fromName, to, toName, amount, color]) => (
        <div className="flex items-center gap-2 rounded-full border border-[var(--splity-line)] bg-[#fbfaf5] py-1.5 pl-1.5 pr-3 text-[12.5px]" key={`${fromName}-${toName}`}>
          <Avatar tone="bg-[#c46920]">{from}</Avatar>
          <span>{fromName}</span>
          <ArrowRightIcon aria-hidden="true" className="h-3.5 w-3.5 text-[var(--splity-muted)]" />
          <Avatar>{to}</Avatar>
          <span>{toName}</span>
          <span className={`ml-auto ${color}`}>{amount}</span>
        </div>
      ))}
    </div>
  );
}

function ShareMini() {
  return (
    <div className="rounded-[14px] border border-[var(--splity-line)] bg-[#fbfaf5] p-3">
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--splity-line-strong)] px-2.5 py-2 text-[11.5px] text-[var(--splity-muted)]">
        splity.app/g/<span className="text-[var(--splity-ink)]">tokyo-trip</span>
        <span className="ml-auto font-[var(--splity-sans)] text-[11px] text-[var(--splity-navy)]">COPY</span>
      </div>
      <div className="mt-2.5 flex -space-x-2">
        <Avatar>Y</Avatar>
        <Avatar tone="bg-[#c46920]">M</Avatar>
        <Avatar tone="bg-[#2e8a5e]">L</Avatar>
        <Avatar tone="bg-[#6b3ce7]">A</Avatar>
        <span className="inline-grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[#f2f1ec] text-[10px] font-bold">+1</span>
      </div>
    </div>
  );
}

function StatusMini() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        ["Mia", "Paid · May 14", "text-[var(--splity-mint)]", "bg-[var(--splity-mint)]"],
        ["Leo", "Waiting · 7d", "text-[var(--splity-gold-strong)]", "bg-[var(--splity-gold-strong)]"],
      ].map(([name, status, color, dot]) => (
        <div className="rounded-xl border border-[var(--splity-line)] bg-[#fbfaf5] p-3" key={name}>
          <p className="text-xs font-semibold">{name}</p>
          <p className={`mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase ${color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {status}
          </p>
        </div>
      ))}
    </div>
  );
}

function ReceiptMini() {
  return (
    <div className="rounded-[14px] border border-[var(--splity-line)] bg-[#fbfaf5] p-3.5">
      {[
        ["Hotpot night", "¥856"],
        ["Late-night taxi", "¥48"],
        ["7-Eleven run", "¥72"],
      ].map(([label, value]) => (
        <div className="flex justify-between border-b border-dashed border-[var(--splity-line)] py-1.5 text-[12.5px]" key={label}>
          <span>{label}</span>
          <span className="">{value}</span>
        </div>
      ))}
      <div className="mt-2.5 flex items-baseline justify-between border-t-2 border-[var(--splity-ink)] pt-2.5">
        <span className="text-[11px] font-bold uppercase text-[var(--splity-muted)]">Your share</span>
        <span className="splity-display text-[22px]">¥244.00</span>
      </div>
    </div>
  );
}

function StepMini({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="rounded-xl border border-[var(--splity-line)] bg-[#fbfaf5] p-2.5">
        <p className="splity-display text-[13.5px]">Weekend Hotpot</p>
        <p className="text-[11px] text-[var(--splity-muted)]">4 members · 5 bills</p>
        <div className="mt-2 flex -space-x-1.5">
          <Avatar>Y</Avatar><Avatar tone="bg-[#c46920]">M</Avatar><Avatar tone="bg-[#2e8a5e]">L</Avatar><Avatar tone="bg-[#6b3ce7]">A</Avatar>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="flex flex-col gap-1 rounded-xl border border-[var(--splity-line)] bg-[#fbfaf5] p-2.5">
        {["Winnie (you)", "Mia", "Leo"].map((name, idx) => (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--splity-line)] bg-white px-2 py-1.5 text-[11.5px]" key={name}>
            <Avatar tone={idx === 1 ? "bg-[#c46920]" : idx === 2 ? "bg-[#2e8a5e]" : undefined}>{name[0]}</Avatar>
            {name}
          </div>
        ))}
        <div className="rounded-lg border border-dashed border-[var(--splity-line-strong)] py-1.5 text-center text-[11px] font-semibold text-[var(--splity-muted)]">+ Add member</div>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="rounded-xl border border-[var(--splity-line)] bg-[#fbfaf5] p-2.5 text-[11.5px]">
        {["Hotpot · Leo", "Taxi · You", "7-Eleven · Mia"].map((label, idx) => (
          <div className="flex justify-between py-0.5" key={label}>
            <span>{label}</span>
            <span className="font-semibold">{["856", "48", "72"][idx]}</span>
          </div>
        ))}
        <div className="mt-1.5 flex justify-between border-t border-dashed border-[var(--splity-line-strong)] pt-1.5 splity-display text-sm">
          <span>Total</span><span>¥976</span>
        </div>
      </div>
    );
  }

  if (index === 3) {
    return (
      <MiniSettlement/>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--splity-line)] bg-[#fbfaf5] p-2.5 text-[11.5px]">
      {["Mia ¥240", "Leo ¥186", "You -> Ada ¥214"].map((row, idx) => (
        <div className="flex items-center rounded-lg border border-[var(--splity-line)] bg-white px-2 py-1.5" key={row}>
          <span>{row}</span>
          <span className={`ml-auto h-1.5 w-1.5 rounded-full ${idx === 0 ? "bg-[var(--splity-mint)]" : "bg-[var(--splity-gold-strong)]"}`} />
        </div>
      ))}
    </div>
  );
}

export function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const text = useLandingCopy();
  const { locale } = text;
  const navLinks = useMemo(() => navIds.map((href, index) => [href, text.nav[index]] as const), [text]);
  const footerColumns = useMemo<FooterColumn[]>(
    () => [
      {
        heading: text.footerProduct,
        links: text.nav.slice(0, 3).map((label, index) => ({
          label,
          href: navIds[index],
        })),
      },
      {
        heading: text.footerSupport,
        links: [
          { label: text.contact, href: "#contact" },
          { label: text.faq, href: "/faq" },
        ],
      },
      {
        heading: text.footerLegal,
        links: [
          { label: text.privacy, href: "/privacy" },
          { label: text.terms, href: "/terms" },
        ],
      },
    ],
    [text]
  );

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleAnchorClick(href: string) {
    const target = document.querySelector(href);
    if (!(target instanceof HTMLElement)) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(1100px_600px_at_8%_0%,#fbe9c7_0%,transparent_55%),radial-gradient(900px_500px_at_100%_12%,#e0e6ff_0%,transparent_50%),var(--splity-bg)] text-[var(--splity-ink)]">
      <nav
        className={`sticky top-0 z-50 flex items-center justify-between border-b px-4 backdrop-blur-xl transition-[background-color,border-color,box-shadow,padding] duration-300 ease-out sm:px-8 ${
          isScrolled
            ? "border-[var(--splity-line)] bg-[rgba(242,241,236,0.92)] py-3 shadow-[0_12px_30px_rgba(12,21,56,0.08)]"
            : "border-transparent bg-[rgba(242,241,236,0.72)] py-4 shadow-none"
        }`}
      >
        <Link href="/" aria-label="Splity home">
          <BrandMark />
        </Link>

        <div className="hidden items-center gap-9 text-[14.5px] font-medium md:flex">
          {navLinks.map(([href, label]) => (
            <a
              className="opacity-80 transition-opacity duration-200 hover:opacity-100"
              href={href}
              key={href}
              onClick={(event) => {
                event.preventDefault();
                handleAnchorClick(href);
              }}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link className="inline-flex items-center gap-2 rounded-full bg-[var(--splity-navy)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(27,42,107,0.22)] hover:-translate-y-0.5" href="/sign-in?mode=register">
            {text.tryNow}
            <ArrowRightIcon />
          </Link>
        </div>
      </nav>

      <header className="relative overflow-hidden pb-10 pt-14 sm:pt-20">
        <div className="mx-auto max-w-[1240px] px-4 text-center sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--splity-line)] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold uppercase">
            <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[var(--splity-gold)] text-xs font-extrabold text-[var(--splity-navy)]">
              <SparklesIcon aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            {text.free}
          </div>

          <h1 className="mt-7  text-[clamp(3.4rem,7.4vw,7.2rem)] font-bold leading-[0.96]">
            <span className="inline-block">{text.heroA}</span>
            <br />
            <span className="inline-block font-normal italic text-[var(--splity-navy)]">{text.heroB}</span>{" "}
            <span className="inline-block">{text.heroC}</span>
          </h1>

          <p className="mx-auto mt-8 max-w-[620px] text-[17px] leading-7 text-[var(--splity-muted)] sm:text-lg">{text.heroBody}</p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link className="inline-flex items-center gap-2 rounded-full bg-[var(--splity-navy)] px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(27,42,107,0.22)] hover:-translate-y-0.5" href="/sign-in?mode=register">
              {text.primary}
              <ArrowRightIcon />
            </Link>
            <a
              className="inline-flex items-center gap-2 rounded-full border border-[var(--splity-line-strong)] px-5 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-white/60"
              href="#how"
              onClick={(event) => {
                event.preventDefault();
                handleAnchorClick("#how");
              }}
            >
              <CirclePlayIcon aria-hidden="true" className="h-4 w-4" />
              {text.secondary}
            </a>
          </div>
        </div>

        <div className="px-4 sm:px-8">
          <DashboardPreview language={locale} />
        </div>
      </header>

      <section className="scroll-mt-24 py-24 sm:py-28" id="why">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <SectionHeading kicker={text.byline} titleA={text.calcA} titleB={text.calcB} body={text.calcBody} />
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
            {text.features.map((feature, index) => (
              <FeatureCard feature={feature} index={index} key={feature.title} />
            ))}
          </div>
        </div>
      </section>

      <section className="scroll-mt-24 py-20" id="cases">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <SectionHeading centered kicker={text.casesKicker} titleA={text.casesTitleA} titleB={text.casesTitleB} body={text.casesBody} />
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {text.useCases.map((useCase: UseCase) => (
              <article className="flex min-h-[220px] flex-col gap-3.5 rounded-[22px] border border-[var(--splity-line)] bg-white p-5" key={useCase.title}>
                <span className={`grid h-9 w-9 place-items-center rounded-[11px] text-sm font-bold ${useCase.tone}`}>{useCase.title.slice(0, 1)}</span>
                <h3 className="text-[19px] font-semibold">{useCase.title}</h3>
                <p className="text-[13.5px] leading-6 text-[var(--splity-muted)]">{useCase.body}</p>
                <span className="mt-auto w-fit rounded-full bg-[#f2f1ec] px-2.5 py-1.5 text-[11px] uppercase">{useCase.tag}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="scroll-mt-24 py-24 sm:py-28" id="how">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <SectionHeading kicker={text.stepsKicker} titleA={text.stepsTitleA} titleB={text.stepsTitleB} body={text.stepsBody} />
          <div className="relative grid gap-3 lg:grid-cols-5">
            <div className="absolute left-[8%] right-[8%] top-[92px] hidden h-px bg-[repeating-linear-gradient(to_right,var(--splity-line-strong)_0_8px,transparent_8px_16px)] lg:block" />
            {text.steps.map((step: Step, index) => (
              <article className="relative z-10 flex min-h-[320px] flex-col gap-3.5 rounded-[18px] border border-[var(--splity-line)] bg-white p-[18px]" key={step.title}>
                <span className="grid h-[34px] w-[34px] place-items-center rounded-full border border-[var(--splity-line-strong)] text-[13px]">0{index + 1}</span>
                <h3 className=" text-[17px] font-semibold">{step.title}</h3>
                <p className="flex-1 text-[12.5px] leading-5 text-[var(--splity-muted)]">{step.body}</p>
                <StepMini index={index} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="scroll-mt-24 py-20" id="contact">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <div className="relative overflow-hidden rounded-[32px] bg-[var(--splity-navy)] px-7 py-14 text-white sm:px-14 sm:py-20">
            <div className="absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(233,177,66,0.6),transparent_70%)]" />
              <div>
                <p className="text-[11.5px] font-bold uppercase text-[var(--splity-gold)]">{text.finalKicker}</p>
                <h2 className="mt-4 text-[clamp(2.5rem,5.6vw,4.5rem)] font-bold leading-[1.04]">
                  {text.finalTitleA} <span className="font-normal italic text-[var(--splity-gold)]">{text.finalTitleB}</span>
                </h2>
                <p className="mt-5 max-w-[480px] text-[17px] leading-7 text-white/70">{text.finalBody}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--splity-gold)] px-5 py-3 text-sm font-semibold text-[var(--splity-navy)] hover:bg-[#f0bc3a]" href="/sign-in?mode=register">
                    {text.tryNow}
                    <ArrowRightIcon />
                  </Link>
                  <a className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10" href="https://github.com/winnie080700/Splity" rel="noreferrer" target="_blank">
                    {text.contact}
                  </a>
                </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--splity-line)] py-10 sm:py-14">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[340px]">
              <BrandMark />
              <p className="mt-5 text-[13.5px] text-[var(--splity-muted)]">{text.footerBody}</p>
            </div>
            <div className="grid grid-cols-3 gap-8 text-sm sm:gap-16">
              {footerColumns.map((column) => (
                <div className="flex flex-col gap-2.5" key={column.heading}>
                  <p className="text-[11px] font-bold uppercase text-[var(--splity-muted)]">{column.heading}</p>
                  {column.links.map((link) =>
                    isPageLink(link.href) ? (
                      <Link className="opacity-80 transition-opacity duration-200 hover:opacity-100" href={link.href} key={link.label}>
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        className="opacity-80 transition-opacity duration-200 hover:opacity-100"
                        href={link.href}
                        key={link.label}
                        onClick={(event) => {
                          event.preventDefault();
                          handleAnchorClick(link.href);
                        }}
                      >
                        {link.label}
                      </a>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
