import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import {
  HomeIcon,
  SettingsIcon,
  UsersIcon
} from "@/shared/ui/icons";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { PublicSiteFooter } from "@/shared/ui/PublicSiteFooter";

export function AppShell() {
  const location = useLocation();
  const { user, isGuest } = useAuth();
  const { t } = useI18n();
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const isSettingsRoute = location.pathname === "/settings";
  const isDashboardRoute = location.pathname === "/dashboard";
  const isGroupsRoute = location.pathname.startsWith("/groups");

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#181612]">
      <div
        className="workspace-shell-layout w-full xl:grid xl:gap-8 xl:pr-6"
        style={{ gridTemplateColumns: isDesktopSidebarCollapsed ? "5.75rem minmax(0,1fr)" : "18.5rem minmax(0,1fr)" }}
      >
        <aside className="relative z-20 hidden xl:block xl:sticky xl:top-0 xl:self-start">
          <div className="workspace-shell-navbar flex h-screen flex-col overflow-hidden">
            <div className={["border-b border-[#ece4d4] py-5", isDesktopSidebarCollapsed ? "flex flex-col items-center gap-3 px-3" : "flex items-center justify-between gap-3 px-5"].join(" ")}>
              <Link to="/dashboard" className={["flex min-w-0 items-center gap-3", isDesktopSidebarCollapsed ? "justify-center" : ""].join(" ")}>
                <BrandLogo className="h-11 w-11 shrink-0" />
                {!isDesktopSidebarCollapsed ? (
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold tracking-tight text-[#1a1813]">{t("app.title")}</div>
                  </div>
                ) : null}
              </Link>

              <button
                type="button"
                className="workspace-shell-collapse shrink-0"
                aria-label={isDesktopSidebarCollapsed ? t("sidebar.expandNavigation") : t("sidebar.collapseNavigation")}
                onClick={() => setIsDesktopSidebarCollapsed((current) => !current)}
              >
                <DesktopRailToggleIcon collapsed={isDesktopSidebarCollapsed} />
              </button>
            </div>

            <div className="scroll-panel flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-7">
                <section>
                  {!isDesktopSidebarCollapsed ? (
                    <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b947f]">
                      {t("sidebar.general")}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <NavLink className={({ isActive }) => buildDesktopNavClass(isActive, isDesktopSidebarCollapsed)} to="/dashboard" end>
                      <HomeIcon className={buildDesktopNavIconClass(isDashboardRoute)} />
                      {!isDesktopSidebarCollapsed ? <span className="truncate">{t("nav.dashboard")}</span> : null}
                    </NavLink>

                    <NavLink className={({ isActive }) => buildDesktopNavClass(isActive || isGroupsRoute, isDesktopSidebarCollapsed)} to="/groups">
                      <UsersIcon className={buildDesktopNavIconClass(isGroupsRoute)} />
                      {!isDesktopSidebarCollapsed ? <span className="truncate">{t("sidebar.groups")}</span> : null}
                    </NavLink>
                  </div>
                </section>

                {!isGuest ? (
                  <section>
                    {!isDesktopSidebarCollapsed ? (
                      <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b947f]">
                        {t("sidebar.support")}
                      </div>
                    ) : null}

                    <NavLink className={({ isActive }) => buildDesktopNavClass(isActive, isDesktopSidebarCollapsed)} to="/settings" end>
                      <SettingsIcon className={buildDesktopNavIconClass(isSettingsRoute)} />
                      {!isDesktopSidebarCollapsed ? <span className="truncate">{t("settings.title")}</span> : null}
                    </NavLink>
                  </section>
                ) : null}
              </div>
            </div>

            <div className="border-t border-[#ece4d4] px-4 py-4">
              {isGuest ? (
                <div className={buildDesktopIdentityClass(isDesktopSidebarCollapsed)}>
                  <div className="workspace-shell-identity-mark">{t("guest.label").slice(0, 1)}</div>
                  {!isDesktopSidebarCollapsed ? (
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#1b1813]">{t("guest.label")}</div>
                      <div className="mt-1 truncate text-sm text-[#7c7567]">{t("guest.sessionHint")}</div>
                    </div>
                  ) : null}
                </div>
              ) : user ? (
                <div className={buildDesktopIdentityClass(isDesktopSidebarCollapsed)}>
                  <div className="workspace-shell-identity-mark">{user.name.slice(0, 1).toUpperCase()}</div>
                  {!isDesktopSidebarCollapsed ? (
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#1b1813]">{user.name}</div>
                      <div className="mt-1 truncate text-sm text-[#7c7567]">{user.email}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="relative z-0 min-w-0">

          <main className="mx-auto min-w-0 max-w-6xl px-4 pb-24 pt-4 sm:px-6 xl:max-w-none xl:px-0 xl:pb-10 xl:pt-7">
            <Outlet />
          </main>

          <footer className="mx-auto max-w-6xl px-4 pb-[5.5rem] sm:px-6 xl:max-w-none xl:px-0 xl:pb-0">
            <PublicSiteFooter />
          </footer>

          <div className="xl:hidden">
            <MobileBottomNav
              isDashboardActive={isDashboardRoute}
              isGroupsActive={isGroupsRoute}
              isSettingsActive={!isGuest && isSettingsRoute}
              isGuest={isGuest}
              labels={{
                dashboard: t("nav.dashboard"),
                groups: t("sidebar.groups"),
                settings: t("settings.title")
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({
  isDashboardActive,
  isGroupsActive,
  isSettingsActive,
  isGuest,
  labels
}: {
  isDashboardActive: boolean;
  isGroupsActive: boolean;
  isSettingsActive: boolean;
  isGuest: boolean;
  labels: {
    dashboard: string;
    groups: string;
    settings: string;
  };
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e6decd] bg-[rgba(251,248,241,0.96)] px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-stretch gap-2">
        <NavLink to="/dashboard" className={({ isActive }) => buildBottomNavClass(isActive || isDashboardActive)}>
          <span className="flex h-5 w-5 items-center justify-center">
            <HomeIcon className="h-4 w-4" />
          </span>
          <span>{labels.dashboard}</span>
        </NavLink>

        <NavLink to="/groups" className={({ isActive }) => buildBottomNavClass(isActive || isGroupsActive)}>
          <span className="flex h-5 w-5 items-center justify-center">
            <UsersIcon className="h-4 w-4" />
          </span>
          <span>{labels.groups}</span>
        </NavLink>

        {!isGuest ? (
          <NavLink to="/settings" className={({ isActive }) => buildBottomNavClass(isActive || isSettingsActive)}>
            <span className="flex h-5 w-5 items-center justify-center">
              <SettingsIcon className="h-4 w-4" />
            </span>
            <span>{labels.settings}</span>
          </NavLink>
        ) : null}
      </div>
    </nav>
  );
}

function DesktopRailToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="4.5" y="5" width="15" height="14" rx="3" />
      <path d="M9 7.75v8.5" />
      {collapsed ? <path d="m12.5 12 3-2.75v5.5L12.5 12Z" fill="currentColor" stroke="none" /> : <path d="m15.5 12-3-2.75v5.5L15.5 12Z" fill="currentColor" stroke="none" />}
    </svg>
  );
}

function buildDesktopNavClass(isActive: boolean, collapsed: boolean) {
  return [
    "group flex min-h-[48px] w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-sm font-medium transition",
    collapsed ? "justify-center px-0" : "",
    isActive
      ? "border-[#5f7520] bg-[#5f7520] text-[#fffdf7] shadow-[0_12px_28px_rgba(95,117,32,0.18)]"
      : "border-transparent bg-[#fbf8f1] text-[#6f6859] hover:border-[#e4dccb] hover:bg-[#fffdf8] hover:text-[#1b1813]"
  ].join(" ");
}

function buildDesktopNavIconClass(isActive: boolean) {
  return [
    "h-4 w-4 shrink-0 transition",
    isActive ? "text-white" : "text-[#1b1813]"
  ].join(" ");
}

function buildDesktopIdentityClass(collapsed: boolean) {
  return [
    "flex items-center gap-3 rounded-[20px] border border-[#e9e1d1] bg-[#fbf8f1] px-3 py-3",
    collapsed ? "justify-center px-0" : ""
  ].join(" ");
}

function buildBottomNavClass(isActive: boolean) {
  return [
    "flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition",
    isActive
      ? "bg-[#5f7520] text-[#fffdf7] shadow-[0_12px_28px_rgba(95,117,32,0.18)]"
      : "bg-[#fbf8f1] text-[#6f6859]"
  ].join(" ");
}
