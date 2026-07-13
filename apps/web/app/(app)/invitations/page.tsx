import { ChevronDown, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { T } from "@/components/i18n/t";
import type { MessageKey } from "@/lib/i18n";
import {
  listMyInvitations,
  listSentInvitations,
  type Invitation,
  type SentInvitation,
} from "@/lib/services/invitations";
import { InvitationActionForms } from "./invitations-client-controls";

const PAGE_SIZE = 5;

type InvitationTab = "all" | "pending" | "sent" | "received";
type InvitationSort = "newest" | "oldest";
type FeedItem = {
  createdAtUtc: string;
  direction: "sent" | "received";
  groupId: string;
  groupName: string;
  id: string;
  participantId: string;
  person: string;
  status: "pending" | "accepted" | "declined";
};

type InvitationsPageProps = {
  searchParams?: Promise<{ page?: string; sort?: string; tab?: string }>;
};

const tabs: { key: InvitationTab; label: MessageKey }[] = [
  { key: "all", label: "invitations.all" },
  { key: "pending", label: "invitations.pending" },
  { key: "sent", label: "invitations.sent" },
  { key: "received", label: "invitations.received" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function hrefFor(input: { page?: number; sort: InvitationSort; tab: InvitationTab }) {
  const params = new URLSearchParams();
  if (input.tab !== "all") params.set("tab", input.tab);
  if (input.sort !== "newest") params.set("sort", input.sort);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `/invitations?${query}` : "/invitations";
}

function readPage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function readSort(value: string | undefined): InvitationSort {
  return value === "oldest" ? "oldest" : "newest";
}

function readTab(value: string | undefined): InvitationTab {
  return value === "pending" || value === "sent" || value === "received" ? value : "all";
}

function statusKey(status: FeedItem["status"]): MessageKey {
  if (status === "accepted") return "groups.invitation.accepted";
  if (status === "declined") return "groups.invitation.declined";
  return "groups.invitation.pending";
}

function statusClasses(status: FeedItem["status"]) {
  if (status === "accepted") return "bg-emerald-50 text-[#087f6f]";
  if (status === "declined") return "bg-red-50 text-[var(--splity-rose)]";
  return "bg-amber-50 text-[#bf7200]";
}

function toStatus(status: number): FeedItem["status"] {
  if (status === 2) return "accepted";
  if (status === 3) return "declined";
  return "pending";
}

function toFeedItems(invitations: Invitation[], sentInvitations: SentInvitation[]) {
  return [
    ...invitations.map((invitation) => ({
      createdAtUtc: invitation.createdAtUtc,
      direction: "received" as const,
      groupId: invitation.groupId,
      groupName: invitation.groupName,
      id: `received-${invitation.participantId}`,
      participantId: invitation.participantId,
      person: invitation.invitedByName,
      status: "pending" as const,
    })),
    ...sentInvitations.map((invitation) => ({
      createdAtUtc: invitation.createdAtUtc,
      direction: "sent" as const,
      groupId: invitation.groupId,
      groupName: invitation.groupName,
      id: `sent-${invitation.participantId}`,
      participantId: invitation.participantId,
      person: invitation.inviteeUsername ? `@${invitation.inviteeUsername}` : invitation.inviteeName,
      status: toStatus(invitation.status),
    })),
  ];
}

export default async function InvitationsPage({ searchParams }: InvitationsPageProps) {
  const params = await searchParams;
  const tab = readTab(params?.tab);
  const sort = readSort(params?.sort);
  const requestedPage = readPage(params?.page);
  const [invitationsResult, sentInvitationsResult] = await Promise.allSettled([
    listMyInvitations(),
    listSentInvitations(),
  ]);
  const invitations: Invitation[] =
    invitationsResult.status === "fulfilled" ? invitationsResult.value : [];
  const sentInvitations: SentInvitation[] =
    sentInvitationsResult.status === "fulfilled" ? sentInvitationsResult.value : [];
  const items = toFeedItems(invitations, sentInvitations).sort((left, right) => {
    const diff = Date.parse(right.createdAtUtc) - Date.parse(left.createdAtUtc);
    return sort === "newest" ? diff : -diff;
  });
  const filteredItems = items.filter((item) => {
    if (tab === "pending") return item.status === "pending";
    if (tab === "sent") return item.direction === "sent";
    if (tab === "received") return item.direction === "received";
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filteredItems.slice(start, start + PAGE_SIZE);
  const showingFrom = filteredItems.length === 0 ? 0 : start + 1;
  const showingTo = start + pageItems.length;
  const tabCounts: Record<InvitationTab, number> = {
    all: items.length,
    pending: items.filter((item) => item.status === "pending").length,
    received: items.filter((item) => item.direction === "received").length,
    sent: items.filter((item) => item.direction === "sent").length,
  };

  return (
    <div className="grid gap-3 sm:gap-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h1 className="splity-display text-2xl font-bold tracking-tight text-[var(--splity-ink)] sm:text-3xl">
            <T k="nav.invitations" />
          </h1>
          <p className="mt-1 text-xs leading-5 text-[var(--splity-muted)] sm:mt-2 sm:text-sm sm:leading-6">
            <T k="invitations.pageBody" />
          </p>
        </div>

        <SortMenu sort={sort} tab={tab} />
      </header>

      <nav
        className="splity-scrollbar-none flex gap-5 overflow-x-auto border-b border-[var(--splity-line)] sm:gap-7"
      >
        {tabs.map((item) => (
          <Link
            aria-current={tab === item.key ? "page" : undefined}
            className={[
              "flex h-10 shrink-0 items-center gap-2 border-b-2 px-1 text-xs font-bold transition sm:h-11 sm:text-sm",
              tab === item.key
                ? "border-[#087f6f] text-[#087f6f]"
                : "border-transparent text-[var(--splity-muted)] hover:text-[var(--splity-ink)]",
            ].join(" ")}
            href={hrefFor({ sort, tab: item.key })}
            key={item.key}
          >
            <T k={item.label} />
            <span className="rounded-full bg-[var(--splity-bg)] px-2 py-0.5 text-[11px] leading-none text-[var(--splity-muted)]">
              {tabCounts[item.key]}
            </span>
          </Link>
        ))}
      </nav>

      <section className="overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white shadow-[0_12px_34px_rgba(12,21,56,0.06)]">
        <div className="hidden grid-cols-[minmax(0,1.8fr)_160px_120px_180px] gap-5 border-b border-[var(--splity-line)] px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--splity-muted)] md:grid">
          <span><T k="invitations.tableInvitation" /></span>
          <span><T k="invitations.status" /></span>
          <span><T k="invitations.tableDate" /></span>
          <span><T k="invitations.tableActions" /></span>
        </div>

        {pageItems.length === 0 ? (
          <EmptyInvitations />
        ) : (
          pageItems.map((item) => <InvitationRow item={item} key={item.id} />)
        )}

        <footer className="flex flex-col gap-3 border-t border-[var(--splity-line)] px-5 py-3 text-sm text-[var(--splity-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            <T
              k="invitations.showing"
              values={{ count: filteredItems.length, from: showingFrom, to: showingTo }}
            />
          </span>
          <div className="flex items-center gap-2">
            <PageLink
              disabled={page <= 1}
              href={hrefFor({ page: page - 1, sort, tab })}
              label="groupsView.previousPage"
            >
              <ChevronLeft className="h-4 w-4" />
            </PageLink>
            <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-[#087f6f] px-2 text-sm font-bold text-white">
              {page}
            </span>
            <PageLink
              disabled={page >= pageCount}
              href={hrefFor({ page: page + 1, sort, tab })}
              label="groupsView.nextPage"
            >
              <ChevronRight className="h-4 w-4" />
            </PageLink>
          </div>
        </footer>
      </section>
    </div>
  );
}

function SortMenu({ sort, tab }: { sort: InvitationSort; tab: InvitationTab }) {
  return (
    <details className="group relative w-fit">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-3 rounded-xl border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-[#087f6f] shadow-sm transition hover:border-[var(--splity-line-strong)] [&::-webkit-details-marker]:hidden">
        <T k={sort === "newest" ? "invitations.newestFirst" : "invitations.oldestFirst"} />
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 grid w-40 overflow-hidden rounded-xl border border-[var(--splity-line)] bg-white p-1 shadow-[0_18px_45px_rgba(12,21,56,0.14)]">
        <Link className="rounded-lg px-3 py-2 text-sm font-bold hover:bg-[var(--splity-bg)]" href={hrefFor({ sort: "newest", tab })}>
          <T k="invitations.newestFirst" />
        </Link>
        <Link className="rounded-lg px-3 py-2 text-sm font-bold hover:bg-[var(--splity-bg)]" href={hrefFor({ sort: "oldest", tab })}>
          <T k="invitations.oldestFirst" />
        </Link>
      </div>
    </details>
  );
}

function InvitationRow({ item }: { item: FeedItem }) {
  return (
    <article className="grid gap-3 border-b border-[var(--splity-line)] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.8fr)_160px_120px_180px] md:items-center md:gap-5 md:px-6">
      <div className="min-w-0">
        <h2 className="truncate text-base font-extrabold leading-6 text-[var(--splity-ink)]">
          {item.groupName}
        </h2>
        <p className="mt-0.5 truncate text-sm leading-5 text-[var(--splity-muted)]">
          <T k={item.direction === "sent" ? "invitations.sentTo" : "invitations.invitedByLabel"} />{" "}
          {item.person}
        </p>
      </div>

      <div>
        <StatusBadge status={item.status} />
      </div>

      <time className="text-sm font-medium text-[var(--splity-muted)]" dateTime={item.createdAtUtc}>
        {formatDate(item.createdAtUtc)}
      </time>

      <div className="flex justify-start md:justify-end">
        <RowAction item={item} />
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: FeedItem["status"] }) {
  return (
    <span className={["inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-bold capitalize", statusClasses(status)].join(" ")}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <T k={statusKey(status)} />
    </span>
  );
}

function RowAction({ item }: { item: FeedItem }) {
  if (item.direction === "received" && item.status === "pending") {
    return <InvitationActionForms compact participantId={item.participantId} />;
  }

  if (item.status === "accepted") {
    return (
      <Link
        className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--splity-line)] px-4 text-sm font-bold text-[#087f6f] transition hover:border-[#087f6f] hover:bg-emerald-50"
        href={`/groups/${item.groupId}`}
      >
        <T k="invitations.viewGroup" />
      </Link>
    );
  }

  if (item.direction === "sent" && item.status === "pending") {
    return (
      <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--splity-line)] px-4 text-sm font-bold text-[#087f6f] opacity-60">
        <T k="invitations.resend" />
      </span>
    );
  }

  return <span className="text-sm font-bold text-[var(--splity-muted)]">—</span>;
}

function PageLink({
  children,
  disabled,
  href,
  label,
}: {
  children: ReactNode;
  disabled: boolean;
  href: string;
  label: MessageKey;
}) {
  const className = "grid h-8 w-8 place-items-center rounded-lg border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:border-[var(--splity-line-strong)] hover:text-[var(--splity-ink)]";

  if (disabled) {
    return (
      <span aria-disabled="true" className={`${className} opacity-45`}>
        {children}
      </span>
    );
  }

  return (
    <Link className={className} href={href}>
      <span className="sr-only"><T k={label} /></span>
      {children}
    </Link>
  );
}

function EmptyInvitations() {
  return (
    <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
      <div>
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(8,127,111,0.10)] text-[#087f6f]">
          <Mail className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-[var(--splity-ink)]">
          <T k="invitations.emptyTitle" />
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[var(--splity-muted)]">
          <T k="invitations.emptyBody" />
        </p>
      </div>
    </div>
  );
}
