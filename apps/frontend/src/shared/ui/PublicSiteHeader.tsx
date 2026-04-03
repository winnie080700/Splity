import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { AnimatedPillSwitch } from "@/shared/ui/AnimatedPillSwitch";
import { BrandLogo } from "@/shared/ui/BrandLogo";

type PublicSiteHeaderNavItem = {
  href: string;
  label: string;
};

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M5 7.5h14" />
          <path d="M5 12h14" />
          <path d="M5 16.5h14" />
        </>
      )}
    </svg>
  );
}

export function PublicSiteHeader({
  navItems = [],
  cta,
  secondaryLink,
  brandMode = "wordmark",
  className = ""
}: {
  navItems?: PublicSiteHeaderNavItem[];
  cta?: {
    label: string;
    to: string;
    onClick?: () => void;
  };
  secondaryLink?: {
    label: string;
    to: string;
  };
  brandMode?: "wordmark" | "logo";
  className?: string;
}) {
  const { language, setLanguage, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hasNav = navItems.length > 0;
  const mobileMenuLabel = mobileMenuOpen
    ? (language === "zh" ? "关闭菜单" : "Close menu")
    : (language === "zh" ? "打开菜单" : "Open menu");

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className={["landing-fade-up relative", className].filter(Boolean).join(" ")} style={{ animationDelay: "60ms" }}>
      <div className="flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 text-[#191813]">
          {brandMode === "logo" ? <BrandLogo className="h-9 w-9" /> : null}
          <span className="text-sm font-semibold tracking-[-0.03em]">{t("app.title")}</span>
        </Link>

        {hasNav ? (
          <nav className="hidden items-center gap-8 text-[11px] font-semibold tracking-[0.03em] text-[#4b493f] md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-[#161616]">
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="hidden items-center gap-3 md:flex">
          {secondaryLink ? (
            <Link className="text-[11px] font-semibold tracking-[0.03em] text-[#5d5749] transition hover:text-[#161616]" to={secondaryLink.to}>
              {secondaryLink.label}
            </Link>
          ) : null}

          <AnimatedPillSwitch
            ariaLabel={t("lang.language")}
            value={language}
            onChange={(nextLanguage) => setLanguage(nextLanguage)}
            options={[
              { value: "en", label: "EN" },
              { value: "zh", label: "CH" }
            ]}
          />

          {cta ? (
            <Link className="landing-olive-button" to={cta.to} onClick={cta.onClick}>
              {cta.label}
            </Link>
          ) : null}
        </div>

        {hasNav ? (
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#ddd7c8] bg-white/75 text-[#1f1d18] md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuLabel}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            <MenuIcon open={mobileMenuOpen} />
          </button>
        ) : null}
      </div>

      {hasNav && mobileMenuOpen ? (
        <div className="mt-3 rounded-[24px] border border-[#dfd8ca] bg-white/90 p-4 shadow-[0_18px_48px_rgba(27,25,20,0.08)] md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-semibold text-[#2a2822]">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-1 py-1 transition hover:text-[#627a1e]"
                onClick={closeMobileMenu}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-4 flex items-center justify-between gap-3">
            <AnimatedPillSwitch
              ariaLabel={t("lang.language")}
              value={language}
              onChange={(nextLanguage) => setLanguage(nextLanguage)}
              options={[
                { value: "en", label: "EN" },
                { value: "zh", label: "CH" }
              ]}
            />

            {cta ? (
              <Link className="landing-olive-button" to={cta.to} onClick={() => {
                closeMobileMenu();
                cta.onClick?.();
              }}>
                {cta.label}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
