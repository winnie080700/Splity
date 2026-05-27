import type { MessageKey } from "@/lib/i18n";
import { GROUP_STATUS, isGroupStatus, type GroupSummary } from "@/lib/services/groups";
import type { SettlementResultDto } from "@/lib/services/settlements";
import type { SortMode, StatusFilter } from "./types";

type StatusMeta = {
  accent: string;
  badge: string;
  filter: StatusFilter;
  labelKey: Extract<
    MessageKey,
    "groups.status.unresolved" | "groups.status.settling" | "groups.status.settled"
  >;
};

const statusMeta: Record<number, StatusMeta> = {
  [GROUP_STATUS.unresolved]: {
    accent: "bg-[var(--splity-rose)]",
    badge: "bg-red-50 text-[var(--splity-rose)]",
    filter: "unresolved",
    labelKey: "groups.status.unresolved",
  },
  [GROUP_STATUS.settling]: {
    accent: "bg-[var(--splity-gold-strong)]",
    badge: "bg-amber-50 text-[var(--splity-gold-strong)]",
    filter: "settling",
    labelKey: "groups.status.settling",
  },
  [GROUP_STATUS.settled]: {
    accent: "bg-[var(--splity-mint)]",
    badge: "bg-emerald-50 text-[var(--splity-mint)]",
    filter: "settled",
    labelKey: "groups.status.settled",
  },
};

export const avatarColors = ["#1b2a6b", "#c46920", "#2e8a5e", "#6b3ce7", "#c24a4a"];

export function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusOf(group: GroupSummary) {
  return isGroupStatus(group.status) ? group.status : GROUP_STATUS.unresolved;
}

export function getStatusMeta(group: GroupSummary) {
  return statusMeta[statusOf(group)] ?? statusMeta[GROUP_STATUS.unresolved];
}

export function countStatus(groups: GroupSummary[], status: number) {
  return groups.filter((group) => statusOf(group) === status).length;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(new Date(value))
    .toUpperCase();
}

export function money(value: number | string | null | undefined, currency = "RM") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount === 0) return `${currency} 0.00`;
  const sign = amount > 0 ? "+" : "-";
  return `${sign}${currency} ${Math.abs(amount).toFixed(2)}`;
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

export function buildHref(params: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(params);

  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      next.delete(key);
      return;
    }
    next.set(key, value);
  });

  const query = next.toString();
  return query ? `/groups?${query}` : "/groups";
}

export function currentParticipantId(
  settlement: SettlementResultDto | null,
  input: { name?: string | null; userId: string; username?: string | null }
) {
  return settlement?.participants.find((participant) => {
    return (
      participant.invited_user_id === input.userId ||
      (input.username ? participant.username === input.username : false) ||
      (input.name ? participant.name === input.name : false)
    );
  })?.id;
}

export function sortGroups(groups: GroupSummary[], sort: SortMode) {
  return [...groups].sort((left, right) => {
    if (sort === "oldest") {
      return new Date(left.created_at_utc).getTime() - new Date(right.created_at_utc).getTime();
    }
    if (sort === "name") {
      return left.name.localeCompare(right.name);
    }
    return new Date(right.created_at_utc).getTime() - new Date(left.created_at_utc).getTime();
  });
}
