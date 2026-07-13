"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, CircleHelp, LogOut, Settings } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  GroupsSearchProvider,
  LiveGroupSearch,
} from "@/app/(app)/groups/groups-search";
import { BrandMark } from "@/components/brand/brand-mark";
import { InvitationDropdown } from "@/components/app/invitation-dropdown";
import { consumeRouteToasts } from "@/components/ui/route-toast";
import { Spinner } from "@/components/ui/spinner";
import { signOut } from "@/lib/auth/actions";
import { useTranslation, type MessageKey } from "@/lib/i18n";

type AppShellProps = {
  children: ReactNode;
  userEmail: string;
  userName: string;
};

function initial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "S";
}

function titleKey(pathname: string): MessageKey {
  if (pathname.startsWith("/invitations")) return "nav.invitations";
  if (pathname.startsWith("/settings")) return "nav.settings";
  return "groupsView.title";
}

function SignOutButton() {
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
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--splity-rose)] transition hover:bg-red-50 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? <Spinner /> : <LogOut className="h-4 w-4" />}
      {t(pending ? "settings.signingOut" : "settings.logOut")}
    </button>
  );
}

export function AppShell({
  children,
  userEmail,
  userName,
}: AppShellProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  useEffect(() => {
    consumeRouteToasts(t);
  }, [pathname, t]);

  return (
    <GroupsSearchProvider>
      <main className="min-h-screen bg-[var(--splity-bg)] text-[var(--splity-ink)]">
        <header className="sticky top-0 z-40 border-b border-[var(--splity-line)] bg-white/95 shadow-[0_1px_10px_rgba(12,21,56,0.04)] backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-[1640px] items-center gap-2 px-3 sm:h-[72px] sm:gap-5 sm:px-6 lg:px-10">
            <Link
              aria-label={t("common.appName")}
              className="shrink-0 transition-opacity hover:opacity-75"
              href="/groups"
            >
              <BrandMark className="hidden sm:inline-flex" size="sm" />
              <BrandMark compact className="sm:hidden" size="sm" />
            </Link>

            <span className="hidden h-7 w-px bg-[var(--splity-line-strong)] sm:block" />
            <h1 className="splity-display min-w-0 shrink truncate text-lg font-bold tracking-tight sm:text-2xl">
              {t(titleKey(pathname))}
            </h1>

            <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
              {pathname === "/groups" ? (
                <div className="hidden md:block">
                  <LiveGroupSearch />
                </div>
              ) : null}

              <InvitationDropdown />

              <details className="group relative" key={pathname}>
                <summary
                  aria-label={t("app.profileMenu")}
                  className="flex cursor-pointer list-none items-center gap-2 rounded-xl p-1 transition hover:bg-[var(--splity-bg)] [&::-webkit-details-marker]:hidden"
                >
                  <span className="splity-display inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#075e54] text-xs font-bold text-white sm:h-10 sm:w-10 sm:text-sm">
                    {initial(userName || userEmail)}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-[var(--splity-muted)] transition-transform group-open:rotate-180 sm:block" />
                </summary>

                <div className="absolute right-0 top-[calc(100%+0.75rem)] w-64 overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white p-2 shadow-[0_18px_45px_rgba(12,21,56,0.14)]">
                  <div className="border-b border-[var(--splity-line)] px-3 py-3">
                    <div className="truncate text-sm font-bold">{userName}</div>
                    <div className="mt-0.5 truncate text-xs text-[var(--splity-muted)]">{userEmail}</div>
                  </div>
                  <nav className="grid gap-1 py-2">
                    <Link
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--splity-bg)]"
                      href="/settings"
                    >
                      <Settings className="h-4 w-4 text-[var(--splity-muted)]" />
                      {t("nav.settings")}
                    </Link>
                    <Link
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--splity-bg)]"
                      href="/faq"
                    >
                      <CircleHelp className="h-4 w-4 text-[var(--splity-muted)]" />
                      {t("nav.help")}
                    </Link>
                  </nav>
                  <form action={signOut} className="border-t border-[var(--splity-line)] pt-2">
                    <SignOutButton />
                  </form>
                </div>
              </details>
            </div>
          </div>

          {pathname === "/groups" ? (
            <div className="border-t border-[var(--splity-line)] px-3 py-1.5 md:hidden">
              <LiveGroupSearch />
            </div>
          ) : null}
        </header>

        <section
          className="splity-page-enter mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1640px] px-3 py-3 sm:min-h-[calc(100vh-72px)] sm:px-6 sm:py-7 lg:px-10"
          key={pathname}
        >
          {children}
        </section>
      </main>
    </GroupsSearchProvider>
  );
}
