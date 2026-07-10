"use client";

import Link from "next/link";
import { Mail, SendHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { InvitationActionForms } from "@/app/(app)/invitations/invitations-client-controls";
import { loadInvitationDropdown } from "@/components/app/invitation-dropdown-actions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation, type MessageKey } from "@/lib/i18n";
import type { Invitation, SentInvitation } from "@/lib/services/invitations";

type Tab = "all" | "pending" | "sent" | "received";
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

const tabs: { key: Tab; label: MessageKey }[] = [
  { key: "all", label: "invitations.all" },
  { key: "pending", label: "invitations.pending" },
  { key: "sent", label: "invitations.sent" },
  { key: "received", label: "invitations.received" },
];

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function statusKey(status: FeedItem["status"]): MessageKey {
  if (status === "accepted") return "groups.invitation.accepted";
  if (status === "declined") return "groups.invitation.declined";
  return "groups.invitation.pending";
}

function statusClass(status: FeedItem["status"]) {
  if (status === "accepted") return "text-[#087f6f]";
  if (status === "declined") return "text-[var(--splity-rose)]";
  return "text-[#bf7200]";
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
      status:
        invitation.status === 2
          ? ("accepted" as const)
          : invitation.status === 3
            ? ("declined" as const)
            : ("pending" as const),
    })),
  ].sort((a, b) => Date.parse(b.createdAtUtc) - Date.parse(a.createdAtUtc));
}

export function InvitationDropdown() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [received, setReceived] = useState<Invitation[]>([]);
  const [sent, setSent] = useState<SentInvitation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const { locale, t } = useTranslation();
  const count = received.length;
  const items = useMemo(
    () => toFeedItems(received, sent),
    [received, sent]
  );
  const visibleItems = items
    .filter((item) => {
      if (tab === "pending") return item.status === "pending";
      if (tab === "sent") return item.direction === "sent";
      if (tab === "received") return item.direction === "received";
      return true;
    })
    .slice(0, 8);
  const tabCounts: Record<Tab, number> = {
    all: items.length,
    pending: items.filter((item) => item.status === "pending").length,
    received: items.filter((item) => item.direction === "received").length,
    sent: items.filter((item) => item.direction === "sent").length,
  };

  async function ensureLoaded() {
    if (loaded || loading) return;
    setLoading(true);
    const result = await loadInvitationDropdown();
    if (result.invitations) setReceived(result.invitations);
    if (result.sentInvitations) setSent(result.sentInvitations);
    setLoaded(true);
    setLoading(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) void ensureLoaded();
  }

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-label={t("invitations.openMenu")}
          className="relative inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:border-[var(--splity-line-strong)] hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
          type="button"
        >
          <Mail className="h-5 w-5" />
          {count > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#087f6f] px-1 text-[10px] font-bold leading-none text-white">
              {count}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[calc(100vw-2rem)] max-w-[600px] overflow-hidden rounded-3xl shadow-[0_26px_70px_rgba(12,21,56,0.18)]"
        sideOffset={14}
      >
        <PopoverArrow className="fill-white stroke-[var(--splity-line)]" />
        <div className="p-5 sm:p-6">
          <h2 className="sr-only">
            {t("nav.invitations")}
          </h2>

          <div className="flex border-b border-[var(--splity-line)]" role="tablist">
            {tabs.map((item) => (
              <button
                aria-selected={tab === item.key}
                className={[
                  "flex min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-1 pb-2.5 text-xs font-bold transition",
                  tab === item.key
                    ? "border-[#087f6f] text-[#087f6f]"
                    : "border-transparent text-[var(--splity-muted)] hover:text-[var(--splity-ink)]",
                ].join(" ")}
                key={item.key}
                onClick={() => setTab(item.key)}
                role="tab"
                type="button"
              >
                <span className="truncate">{t(item.label)}</span>
                <span className="rounded-full bg-[var(--splity-bg)] px-2 py-0.5 text-[10px] leading-none text-[var(--splity-muted)]">
                  {tabCounts[item.key]}
                </span>
              </button>
            ))}
          </div>

          {loading && items.length === 0 ? (
            <div className="grid gap-2 py-3">
              {[0, 1, 2].map((item) => (
                <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--splity-line)] py-2.5 last:border-b-0" key={item}>
                  <div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-2 h-3.5 w-48" />
                  </div>
                  <div className="grid justify-items-end gap-3">
                    <Skeleton className="h-3.5 w-12" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="grid min-h-44 place-items-center text-center">
              <div>
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(8,127,111,0.10)] text-[#087f6f]">
                  <SendHorizontal className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-bold text-[var(--splity-ink)]">
                  {t(tab === "sent" ? "invitations.emptySentTitle" : "invitations.emptyTitle")}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--splity-muted)]">
                  {t("invitations.emptyDropdownBody")}
                </p>
              </div>
            </div>
          ) : (
            <div className="splity-scrollbar-none max-h-[460px] overflow-y-auto">
              {visibleItems.map((item) => (
                <article
                  className="flex flex-col gap-2 border-b border-[var(--splity-line)] py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-3"
                  key={item.id}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <h3 className="min-w-[6.5rem] max-w-[8.5rem] truncate text-sm font-extrabold leading-5 text-[var(--splity-ink)]">
                      {item.groupName}
                    </h3>
                    <p className="flex min-w-0 flex-1 items-center gap-2 truncate text-xs text-[var(--splity-muted)]">
                      {t(item.direction === "sent" ? "invitations.sentTo" : "invitations.invitedByLabel")}{" "}
                      {item.person}
                      <span className={["inline-flex items-center gap-1.5 font-bold", statusClass(item.status)].join(" ")}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {t(statusKey(item.status))}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-2 text-right sm:min-w-[10.5rem]">
                    <time className="whitespace-nowrap text-xs font-medium leading-5 text-[var(--splity-muted)]">
                      {formatDate(item.createdAtUtc, locale)}
                    </time>
                    {item.direction === "received" && item.status === "pending" ? (
                      <InvitationActionForms compact participantId={item.participantId} />
                    ) : item.status === "accepted" ? (
                      <Link
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--splity-line)] px-3 text-xs font-bold text-[#087f6f] transition hover:border-[#087f6f] hover:bg-emerald-50"
                        href={`/groups/${item.groupId}`}
                      >
                        {t("invitations.viewGroup")}
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <Link
          className="flex h-14 items-center justify-center gap-3 border-t border-[var(--splity-line)] text-sm font-bold text-[#087f6f] transition hover:bg-emerald-50"
          href="/invitations"
        >
          {t("invitations.viewAll")}
          <span aria-hidden>›</span>
        </Link>
      </PopoverContent>
    </Popover>
  );
}
