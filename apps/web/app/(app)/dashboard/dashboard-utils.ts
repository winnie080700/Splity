import { GROUP_STATUS, isGroupStatus, type GroupSummary } from "@/lib/services/groups";
import type { SettlementResultDto } from "@/lib/services/settlements";

export type StatusMeta = {
  badgeTone: "green" | "amber" | "blue";
  dot: string;
  labelKey: "groups.status.unresolved" | "groups.status.settling" | "groups.status.settled";
};

const statusMeta: Record<number, StatusMeta> = {
  [GROUP_STATUS.unresolved]: {
    badgeTone: "green",
    dot: "bg-[var(--splity-mint)]",
    labelKey: "groups.status.unresolved",
  },
  [GROUP_STATUS.settling]: {
    badgeTone: "amber",
    dot: "bg-[var(--splity-gold-strong)]",
    labelKey: "groups.status.settling",
  },
  [GROUP_STATUS.settled]: {
    badgeTone: "blue",
    dot: "bg-[var(--splity-navy)]",
    labelKey: "groups.status.settled",
  },
};

export function getStatusMeta(status: number) {
  return statusMeta[status] ?? statusMeta[GROUP_STATUS.unresolved];
}

export function countByStatus(groups: GroupSummary[], status: number) {
  return groups.filter((group) => (isGroupStatus(group.status) ? group.status : 0) === status).length;
}

export function money(value: number | string, currency = "RM") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency} 0.00`;
  return `${currency} ${Math.abs(amount).toFixed(2)}`;
}

export function signedMoney(value: number | string, currency = "RM") {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return `${currency} 0.00`;
  return `${amount > 0 ? "+" : "-"}${money(amount, currency)}`;
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

export function findCurrentParticipantId(
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

export function settlementProgress(group: GroupSummary, settlement: SettlementResultDto | null) {
  const status = isGroupStatus(group.status) ? group.status : GROUP_STATUS.unresolved;
  if (status === GROUP_STATUS.settled) return 100;
  if (status === GROUP_STATUS.unresolved) return 0;
  if (!settlement?.transfers.length) return 100;

  const completed = settlement.transfers.filter((transfer) => transfer.status === 2).length;
  return Math.round((completed / settlement.transfers.length) * 100);
}
