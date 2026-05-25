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

import { BrandMark } from "@/components/brand/brand-mark";
import { T } from "@/components/i18n/t";
import { signOut } from "@/lib/auth/actions";

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
        "group flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 text-sm font-semibold transition-all duration-300 ease-out",
        active
          ? "bg-[var(--splity-navy)] text-white shadow-[0_8px_18px_rgba(27,42,107,0.18)]"
          : "text-[var(--splity-ink)] hover:bg-white/70",
        collapsed ? "justify-center" : "",
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
      <span
        className={[
          "min-w-0 flex-1 truncate transition-all duration-300 ease-out",
          collapsed ? "w-0 max-w-0 opacity-0" : "max-w-40 opacity-100",
        ].join(" ")}
      >
        {item.label}
      </span>
      {typeof item.count === "number" ? (
        <span
          className={[
            "ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums transition-all duration-300 ease-out",
            active
              ? "bg-white/15 text-[var(--splity-gold)]"
              : "bg-[rgba(233,177,66,0.18)] text-[var(--splity-gold-strong)]",
            collapsed ? "w-0 max-w-0 overflow-hidden px-0 opacity-0" : "max-w-12 opacity-100",
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

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true");
  }, []);

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
      href: "/dashboard",
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
      <aside className="sticky top-0 z-20 flex max-h-screen flex-col gap-5 overflow-hidden px-4 py-5 transition-all duration-300 ease-out max-lg:static max-lg:max-h-none">
        <div className="flex items-center justify-between gap-2 px-1">
          <Link className={["transition-all duration-300 ease-out", collapsed ? "mx-auto" : ""].join(" ")} href="/dashboard">
            <BrandMark compact={collapsed} size="md" />
          </Link>
          <button
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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

        <div className="grid gap-5">
          <nav className="grid gap-1">
            {collapsed ? null : (
              <div className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--splity-muted)] transition-opacity duration-200">
                <T k="nav.general" />
              </div>
            )}
            {generalItems.map((item) => (
              <NavLink collapsed={collapsed} item={item} key={`${item.href}-${String(item.label)}`} pathname={pathname} />
            ))}
          </nav>

          <nav className="grid gap-1">
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

        <div className="flex-1" />

        <div
          className={[
            "flex items-center gap-3 overflow-hidden rounded-[14px] border border-[var(--splity-line)] bg-white p-3 shadow-sm transition-all duration-300 ease-out",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          <span className="inline-flex h-8 w-8 shrink-0 rotate-[-3deg] items-center justify-center rounded-[10px] bg-[var(--splity-navy)] font-[var(--splity-display)] text-sm font-extrabold text-white">
            {initial(userName || userEmail)}
          </span>
          {collapsed ? null : (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{userName}</div>
                <div className="truncate font-[var(--splity-mono)] text-[11px] text-[var(--splity-muted)]">
                  {userEmail}
                </div>
              </div>
              <form action={signOut}>
                <button
                  aria-label="Sign out"
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

      <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-10">{children}</section>
    </main>
  );
}
