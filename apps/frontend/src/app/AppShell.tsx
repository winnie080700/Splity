import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ArrowsIcon, GlobeIcon, HomeIcon, ReceiptIcon, UsersIcon } from "@/shared/ui/icons";

export function AppShell() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { t, toggleLanguage } = useI18n();
  const groupBasePath = location.pathname.match(/^\/groups\/[^/]+/)?.[0];

  const navItems = groupBasePath
    ? [
        { to: "/", label: t("nav.home"), icon: <HomeIcon className="h-4 w-4" /> },
        { to: `${groupBasePath}/participants`, label: t("nav.participants"), icon: <UsersIcon className="h-4 w-4" /> },
        { to: `${groupBasePath}/bills`, label: t("nav.bills"), icon: <ReceiptIcon className="h-4 w-4" /> },
        { to: `${groupBasePath}/settlements`, label: t("nav.settlement"), icon: <ArrowsIcon className="h-4 w-4" /> }
      ]
    : [];

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.14),transparent_28%)]" />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="card mb-6 overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <span className="eyebrow">{t("app.kicker")}</span>
                <div className="space-y-2">
                  <Link to="/" className="block text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                    {t("app.title")}
                  </Link>
                  <p className="max-w-2xl text-sm leading-6 text-slate">
                    {isHome ? t("app.workspaceSummary") : t("app.groupSummary")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <div className="hidden max-w-xs rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate shadow-soft lg:block">
                  <div className="font-semibold text-ink">{t("app.tagline")}</div>
                  <div className="mt-1">{t("home.demoMode")}</div>
                </div>
                <button className="button-secondary" onClick={toggleLanguage} type="button">
                  <GlobeIcon className="h-4 w-4" />
                  {t("lang.toggle")}
                </button>
              </div>
            </div>

            {!isHome && navItems.length > 0 ? (
              <nav className="flex flex-wrap gap-2 text-sm">
                {navItems.map((item) => (
                  <NavItem key={item.to} to={item.to} icon={item.icon}>
                    {item.label}
                  </NavItem>
                ))}
              </nav>
            ) : null}
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium shadow-soft",
          isActive
            ? "bg-ink text-white"
            : "border border-slate-200 bg-white/80 text-slate hover:-translate-y-0.5 hover:bg-white hover:text-ink"
        ].join(" ")
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}
