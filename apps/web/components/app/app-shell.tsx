"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HelpCircle,
  Inbox,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/brand-mark";
import { T } from "@/components/i18n/t";
import { LanguageSelect } from "@/components/i18n/language-select";
import { consumeRouteToasts } from "@/components/ui/route-toast";
import { signOut } from "@/lib/auth/actions";
import { useTranslation } from "@/lib/i18n";

type AppShellProps = {
  children: ReactNode;
  groupCount: number;
  invitationCount: number;
  userEmail: string;
  userName: string;
};

type NavItem = {
  count?: number;
  href: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
  label: ReactNode;
};

const COLLAPSED_STORAGE_KEY = "splity.sidebar.collapsed";

function initial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "S";
}

function NavLink({
  collapsed,
  item,
  pathname,
}: {
  collapsed: boolean;
  item: NavItem;
  pathname: string;
}) {
  const Icon = item.icon;
  const active = item.isActive(pathname);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={[
        "group h-11 overflow-hidden rounded-xl text-sm font-semibold transition-all duration-300 ease-out",
        active
          ? "bg-[var(--splity-navy)] text-white shadow-[0_8px_18px_rgba(27,42,107,0.18)]"
          : "text-[var(--splity-ink)] hover:bg-white/70",
        collapsed
          ? "grid w-11 place-items-center"
          : "flex items-center gap-3 px-3",
      ].join(" ")}
      href={item.href}
      title={collapsed && typeof item.label === "string" ? item.label : undefined}
    >
      <Icon
        className={[
          "h-[18px] w-[18px] shrink-0 transition-colors duration-300",
          active ? "text-[var(--splity-gold)]" : "text-[var(--splity-muted)]",
        ].join(" ")}
      />
      {collapsed ? null : (
        <span className="min-w-0 flex-1 truncate transition-all duration-300 ease-out">
          {item.label}
        </span>
      )}
      {!collapsed && typeof item.count === "number" ? (
        <span
          className={[
            "ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums transition-all duration-300 ease-out",
            active
              ? "bg-white/15 text-[var(--splity-gold)]"
              : "bg-[rgba(233,177,66,0.18)] text-[var(--splity-gold-strong)]",
            "max-w-12 opacity-100",
          ].join(" ")}
        >
          {item.count}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({
  children,
  groupCount,
  invitationCount,
  userEmail,
  userName,
}: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    consumeRouteToasts(t);
  }, [pathname, t]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  }

  const generalItems: NavItem[] = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: (current) => current === "/dashboard",
      label: <T k="nav.dashboard" />,
    },
    {
      count: groupCount,
      href: "/groups",
      icon: Users,
      isActive: (current) => current.startsWith("/groups"),
      label: <T k="dashboard.groupsTitle" />,
    },
    {
      count: invitationCount,
      href: "/invitations",
      icon: Inbox,
      isActive: (current) => current.startsWith("/invitations"),
      label: <T k="nav.invitations" />,
    },
  ];
  const supportItems: NavItem[] = [
    {
      href: "/settings",
      icon: Settings,
      isActive: (current) => current.startsWith("/settings"),
      label: <T k="nav.settings" />,
    },
    {
      href: "/faq",
      icon: HelpCircle,
      isActive: (current) => current === "/faq",
      label: <T k="nav.help" />,
    },
  ];

  return (
    <main
      className={[
        "min-h-screen bg-[var(--splity-bg)] text-[var(--splity-ink)] transition-[grid-template-columns] duration-300 ease-out lg:grid",
        collapsed
          ? "lg:grid-cols-[84px_minmax(0,1fr)]"
          : "lg:grid-cols-[260px_minmax(0,1fr)]",
      ].join(" ")}
    >
      <aside
        className={[
          "sticky top-0 z-20 flex max-h-screen flex-col gap-5 overflow-hidden border-r border-[var(--splity-line)] bg-[#f7f5ee] py-5 shadow-[8px_0_24px_rgba(12,21,56,0.04)] transition-all duration-300 ease-out max-lg:static max-lg:max-h-none",
          collapsed ? "items-stretch px-0" : "px-4",
        ].join(" ")}
      >
        <div
          className={[
            "flex w-full items-center gap-2 px-1",
            collapsed ? "flex-col justify-center px-0" : "justify-between",
          ].join(" ")}
        >
          <Link className="transition-all duration-300 ease-out" href="/dashboard">
            <BrandMark compact={collapsed} size="md" />
          </Link>
          <button
            aria-expanded={!collapsed}
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            className={[
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--splity-line)] bg-white/70 text-[var(--splity-muted)] transition-all duration-300 hover:bg-white hover:text-[var(--splity-ink)]",
              collapsed ? "hidden lg:inline-flex" : "",
            ].join(" ")}
            onClick={toggleCollapsed}
            type="button"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className={["grid min-h-0 flex-1 content-start gap-5 overflow-y-auto", collapsed ? "w-full" : ""].join(" ")}>
          <nav className={["grid gap-1", collapsed ? "justify-items-center" : ""].join(" ")}>
            {collapsed ? null : (
              <div className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--splity-muted)] transition-opacity duration-200">
                <T k="nav.general" />
              </div>
            )}
            {generalItems.map((item) => (
              <NavLink collapsed={collapsed} item={item} key={`${item.href}-${String(item.label)}`} pathname={pathname} />
            ))}
          </nav>

          <nav className={["grid gap-1", collapsed ? "justify-items-center" : ""].join(" ")}>
            {collapsed ? null : (
              <div className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--splity-muted)] transition-opacity duration-200">
                <T k="nav.support" />
              </div>
            )}
            {supportItems.map((item) => (
              <NavLink collapsed={collapsed} item={item} key={`${item.href}-${String(item.label)}`} pathname={pathname} />
            ))}
          </nav>
        </div>

        <div
          className={[
            "shrink-0 overflow-hidden rounded-[14px] border border-[var(--splity-line)] bg-white shadow-sm transition-all duration-300 ease-out",
            collapsed ? "mx-auto grid w-11 justify-items-center gap-2 border-0 bg-transparent p-0 shadow-none" : "flex items-center gap-3 p-3",
          ].join(" ")}
        >
          <span className="inline-flex h-8 w-8 shrink-0 rotate-[-3deg] items-center justify-center rounded-[10px] bg-[var(--splity-navy)] splity-display text-sm font-extrabold text-white">
            {initial(userName || userEmail)}
          </span>
          {collapsed ? (
            <form action={signOut} onSubmit={() => toast.loading(t("settings.signingOut"))}>
              <button
                aria-label={t("dashboard.signOut")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[var(--splity-muted)] shadow-sm transition hover:bg-[var(--splity-line)] hover:text-[var(--splity-ink)]"
                type="submit"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{userName}</div>
                <div className="truncate text-[11px] text-[var(--splity-muted)]">
                  {userEmail}
                </div>
              </div>
              <form action={signOut} onSubmit={() => toast.loading(t("settings.signingOut"))}>
                <button
                  aria-label={t("dashboard.signOut")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--splity-bg)] text-[var(--splity-muted)] transition hover:bg-[var(--splity-line)] hover:text-[var(--splity-ink)]"
                  type="submit"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col px-4 pb-1 pt-6 sm:px-6 lg:px-10">
        <div className="min-w-0 flex-1">{children}</div>
        <footer className="mt-6 flex flex-col gap-2 border-t border-[var(--splity-line)] px-1 py-2 text-[10px] uppercase tracking-[0.06em] text-[var(--splity-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            <T k="app.footerLeft" />
          </span>
          <span>
            <T k="app.footerRight" />
          </span>
          <LanguageSelect />
        </footer>
      </section>
    </main>
  );
}
