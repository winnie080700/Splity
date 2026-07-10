import { GROUP_STATUS } from "@/lib/domain/status";

export type GroupPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{
    billId?: string;
    billMode?: string;
    date?: string;
    payer?: string;
    q?: string;
    shareSettlement?: string;
    split?: string;
    tab?: string;
    activity?: string;
    activityFilter?: string;
  }>;
};

export type StatusMeta = {
  dot: string;
  labelKey:
    | "groups.status.unresolved"
    | "groups.status.settling"
    | "groups.status.settled";
  tone: "red" | "amber" | "green";
};

export const statusMeta: Record<number, StatusMeta> = {
  [GROUP_STATUS.unresolved]: {
    dot: "bg-[var(--splity-rose)]",
    labelKey: "groups.status.unresolved",
    tone: "red",
  },
  [GROUP_STATUS.settling]: {
    dot: "bg-[var(--splity-gold-strong)]",
    labelKey: "groups.status.settling",
    tone: "amber",
  },
  [GROUP_STATUS.settled]: {
    dot: "bg-[var(--splity-mint)]",
    labelKey: "groups.status.settled",
    tone: "green",
  },
};
