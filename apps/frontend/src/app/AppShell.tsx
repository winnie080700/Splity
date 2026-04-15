import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import {
  HomeIcon,
  LogOutIcon,
  MailIcon,
  SettingsIcon,
  UsersIcon
} from "@/shared/ui/icons";
import { BrandLogo } from "@/shared/ui/BrandLogo";
import { PublicSiteFooter } from "@/shared/ui/PublicSiteFooter";

export function AppShell() {
  const location = useLocation();
  const { user, isGuest, signOut } = useAuth();
  const { t } = useI18n();
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const isSettingsRoute = location.pathname === "/settings";
  const isDashboardRoute = location.pathname === "/dashboard";
  const isInvitationsRoute = location.pathname.startsWith("/invitations");
  const isGroupsRoute = location.pathname.startsWith("/groups");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(202,138,4,0.08),transparent_22%),radial-gradient(circle_at_top_right,rgba(30,58,138,0.08),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] text-ink">
      <div
        className="workspace-shell-layout w-full lg:grid lg:gap-6 lg:pr-4 xl:gap-8 xl:pr-6"
        style={{ gridTemplateColumns: isDesktopSidebarCollapsed ? "5.75rem minmax(0,1fr)" : "18.5rem minmax(0,1fr)" }}
      >
        <aside className="relative z-20 hidden lg:block lg:sticky lg:top-0 lg:self-start">
          <div className="workspace-shell-navbar flex h-screen flex-col overflow-hidden">
            <div className={["border-b border-slate-200/90 py-5", isDesktopSidebarCollapsed ? "flex flex-col items-center gap-3 px-3" : "flex items-center justify-between gap-3 px-5"].join(" ")}>
              <Link to="/dashboard" className={["flex min-w-0 items-center gap-3", isDesktopSidebarCollapsed ? "justify-center" : ""].join(" ")}>
                <BrandLogo className="h-11 w-11 shrink-0" />
                {!isDesktopSidebarCollapsed ? (
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold tracking-tight text-ink">{t("app.title")}</div>
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
                    <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700/80">
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

                    {!isGuest ? (
                      <NavLink className={({ isActive }) => buildDesktopNavClass(isActive || isInvitationsRoute, isDesktopSidebarCollapsed)} to="/invitations">
                        <MailIcon className={buildDesktopNavIconClass(isInvitationsRoute)} />
                        {!isDesktopSidebarCollapsed ? <span className="truncate">{t("nav.invitations")}</span> : null}
                      </NavLink>
                    ) : null}
                  </div>
                </section>

                {!isGuest ? (
                  <section>
                    {!isDesktopSidebarCollapsed ? (
                      <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700/80">
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

            <div className="border-t border-slate-200/90 px-4 py-4">
              {isGuest ? (
                <div className={buildDesktopIdentityClass(isDesktopSidebarCollapsed)}>
                  <div className="workspace-shell-identity-mark">{t("guest.label").slice(0, 1)}</div>
                  {!isDesktopSidebarCollapsed ? (
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{t("guest.label")}</div>
                      <div className="mt-1 truncate text-sm text-muted">{t("guest.sessionHint")}</div>
                    </div>
                  ) : null}
                </div>
              ) : user ? (
                <div className={buildDesktopIdentityClass(isDesktopSidebarCollapsed)}>
                  <div className="workspace-shell-identity-mark">{user.name.slice(0, 1).toUpperCase()}</div>
                  {!isDesktopSidebarCollapsed ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
                        <div className="mt-1 truncate text-sm text-muted">{user.email}</div>
                      </div>
                      <button
                        type="button"
                        className="workspace-shell-collapse shrink-0"
                        aria-label={t("auth.logout")}
                        onClick={() => {
                          void signOut();
                        }}
                      >
                        <LogOutIcon className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="workspace-shell-collapse shrink-0"
                      aria-label={t("auth.logout")}
                      onClick={() => {
                        void signOut();
                      }}
                    >
                      <LogOutIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="relative z-0 min-w-0">

          <main className="mx-auto min-w-0 max-w-6xl px-4 pb-24 pt-4 sm:px-6 lg:max-w-none lg:px-0 lg:pb-10 lg:pt-7">
            <Outlet />
          </main>

          <footer className="mx-auto max-w-6xl px-4 pb-[5.5rem] sm:px-6 lg:max-w-none lg:px-0 lg:pb-0">
            <PublicSiteFooter />
          </footer>

          <div className="lg:hidden">
            <MobileBottomNav
              isDashboardActive={isDashboardRoute}
              isGroupsActive={isGroupsRoute}
              isInvitationsActive={!isGuest && isInvitationsRoute}
              isSettingsActive={!isGuest && isSettingsRoute}
              isGuest={isGuest}
              labels={{
                dashboard: t("nav.dashboard"),
                groups: t("sidebar.groups"),
                invitations: t("nav.invitations"),
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
  isInvitationsActive,
  isSettingsActive,
  isGuest,
  labels
}: {
  isDashboardActive: boolean;
  isGroupsActive: boolean;
  isInvitationsActive: boolean;
  isSettingsActive: boolean;
  isGuest: boolean;
  labels: {
    dashboard: string;
    groups: string;
    invitations: string;
    settings: string;
  };
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-[rgba(255,255,255,0.94)] px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-stretch gap-1.5 sm:gap-2">
        <NavLink to="/dashboard" className={({ isActive }) => buildBottomNavClass(isActive || isDashboardActive)}>
          <span className="flex h-5 w-5 items-center justify-center">
            <HomeIcon className="h-4 w-4" />
          </span>
          <span className="hidden min-[420px]:inline">{labels.dashboard}</span>
        </NavLink>

        <NavLink to="/groups" className={({ isActive }) => buildBottomNavClass(isActive || isGroupsActive)}>
          <span className="flex h-5 w-5 items-center justify-center">
            <UsersIcon className="h-4 w-4" />
          </span>
          <span className="hidden min-[420px]:inline">{labels.groups}</span>
        </NavLink>

        {!isGuest ? (
          <NavLink to="/invitations" className={({ isActive }) => buildBottomNavClass(isActive || isInvitationsActive)}>
            <span className="flex h-5 w-5 items-center justify-center">
              <MailIcon className="h-4 w-4" />
            </span>
            <span className="hidden min-[420px]:inline">{labels.invitations}</span>
          </NavLink>
        ) : null}

        {!isGuest ? (
          <NavLink to="/settings" className={({ isActive }) => buildBottomNavClass(isActive || isSettingsActive)}>
            <span className="flex h-5 w-5 items-center justify-center">
              <SettingsIcon className="h-4 w-4" />
            </span>
            <span className="hidden min-[420px]:inline">{labels.settings}</span>
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
      ? "border-[#1e3a8a] bg-[#1e3a8a] text-white shadow-[0_12px_28px_rgba(30,58,138,0.18)]"
      : "border-transparent bg-[rgba(255,255,255,0.92)] text-[#475569] hover:border-[rgba(30,58,138,0.14)] hover:bg-white hover:text-[#0f172a]"
  ].join(" ");
}

function buildDesktopNavIconClass(isActive: boolean) {
  return [
    "h-4 w-4 shrink-0 transition",
    isActive ? "text-white" : "text-[#0f172a]"
  ].join(" ");
}

function buildDesktopIdentityClass(collapsed: boolean) {
  return [
    "flex items-center gap-3 rounded-[20px] border border-slate-200/90 bg-[rgba(255,255,255,0.94)] px-3 py-3",
    collapsed ? "justify-center px-0" : ""
  ].join(" ");
}

function buildBottomNavClass(isActive: boolean) {
  return [
    "flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2 text-[10px] font-semibold tracking-[0.02em] transition sm:px-3 sm:text-[11px]",
    isActive
      ? "bg-[#1e3a8a] text-white shadow-[0_12px_28px_rgba(30,58,138,0.18)]"
      : "bg-[rgba(255,255,255,0.94)] text-[#475569]"
  ].join(" ");
}
