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
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/brand-mark";
import { T } from "@/components/i18n/t";
import { Spinner } from "@/components/ui/spinner";
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

function SidebarSignOutButton() {
  const { pending } = useFormStatus();
  const toastId = useRef<string | number | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (pending && toastId.current === null) {
      toastId.current = toast.loading(t("settings.signingOut"));
    }

    if (!pending && toastId.current !== null) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }

    return () => {
      if (toastId.current !== null) toast.dismiss(toastId.current);
    };
  }, [pending, t]);

  return (
    <button
      aria-label={t("dashboard.signOut")}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--splity-bg)] text-[var(--splity-muted)] transition hover:bg-[var(--splity-line)] hover:text-[var(--splity-ink)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? <Spinner /> : <LogOut className="h-4 w-4" />}
    </button>
  );
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

function MobileNavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const Icon = item.icon;
  const active = item.isActive(pathname);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={[
        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-bold transition-colors",
        active
          ? "text-[var(--splity-navy)]"
          : "text-[var(--splity-muted)] hover:text-[var(--splity-ink)]",
      ].join(" ")}
      href={item.href}
    >
      <span
        className={[
          "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
          active
            ? "border-[var(--splity-navy)] bg-[var(--splity-navy)] text-white"
            : "border-transparent bg-transparent",
        ].join(" ")}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="w-full truncate text-center leading-tight">{item.label}</span>
      {typeof item.count === "number" && item.count > 0 ? (
        <span className="absolute right-2 top-1 min-w-4 rounded-full bg-[var(--splity-gold)] px-1 text-center text-[10px] font-extrabold leading-4 text-[var(--splity-ink)]">
          {item.count > 99 ? "99+" : item.count}
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
  const mobileItems = [...generalItems, ...supportItems];

  return (
    <main
      className={[
        "min-h-screen w-full min-w-0 overflow-x-clip bg-[var(--splity-bg)] text-[var(--splity-ink)] transition-[grid-template-columns] duration-300 ease-out lg:grid",
        collapsed
          ? "lg:grid-cols-[84px_minmax(0,1fr)]"
          : "lg:grid-cols-[260px_minmax(0,1fr)]",
      ].join(" ")}
    >
      <aside
        className={[
          "sticky top-0 z-20 hidden max-h-screen flex-col gap-5 overflow-hidden border-r border-[var(--splity-line)] bg-[#f7f5ee] py-5 shadow-[8px_0_24px_rgba(12,21,56,0.04)] transition-all duration-300 ease-out lg:flex",
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

        <div className={["grid gap-5", collapsed ? "w-full" : ""].join(" ")}>
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

        <div className="flex-1" />

        <div
          className={[
            "flex items-center gap-3 overflow-hidden rounded-[14px] border border-[var(--splity-line)] bg-white shadow-sm transition-all duration-300 ease-out",
            collapsed ? "h-11 w-11 justify-center p-0" : "p-3",
          ].join(" ")}
        >
          <span className="inline-flex h-8 w-8 shrink-0 rotate-[-3deg] items-center justify-center rounded-[10px] bg-[var(--splity-navy)] splity-display text-sm font-extrabold text-white">
            {initial(userName || userEmail)}
          </span>
          {collapsed ? null : (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{userName}</div>
                <div className="truncate text-[11px] text-[var(--splity-muted)]">
                  {userEmail}
                </div>
              </div>
              <form action={signOut}>
                <SidebarSignOutButton />
              </form>
            </>
          )}
        </div>
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--splity-line)] bg-[#f7f5ee]/95 px-3 lg:hidden">
        <Link href="/dashboard">
          <BrandMark compact size="sm" />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="max-w-[9rem] truncate text-xs font-bold text-[var(--splity-muted)]">
            {userName}
          </span>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--splity-navy)] splity-display text-xs font-extrabold text-white">
            {initial(userName || userEmail)}
          </span>
          <form action={signOut}>
            <SidebarSignOutButton />
          </form>
        </div>
      </div>

      <section className="w-full min-w-0 overflow-x-clip px-3 py-4 pb-24 sm:px-6 lg:px-10 lg:py-6 lg:pb-6">
        {children}
      </section>

      <nav
        aria-label={t("nav.general")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--splity-line)] bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-2px_8px_rgba(12,21,56,0.08)] lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch gap-1">
          {mobileItems.map((item) => (
            <MobileNavLink item={item} key={item.href} pathname={pathname} />
          ))}
        </div>
      </nav>
    </main>
  );
}
