import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { T } from "@/components/i18n/t";
import { Badge } from "@/components/ui/badge";
import { LoadingLink } from "@/components/ui/route-toast";
import type { BillSummary } from "@/lib/calculations/bill-read-projection";
import { GROUP_STATUS, isGroupStatus, type GroupSummary } from "@/lib/services/groups";
import type { SettlementResultDto, SettlementTransferDto } from "@/lib/services/settlements";
import {
  getStatusMeta,
  initials,
  money,
  settlementProgress,
  signedMoney,
  type StatusMeta,
} from "./dashboard-utils";

export function StatusCount({
  count,
  labelKey,
  tone,
}: {
  count: number;
  labelKey: StatusMeta["labelKey"];
  tone: "gold" | "mint" | "rose";
}) {
  const toneClass = {
    gold: "text-[var(--splity-gold-strong)]",
    mint: "text-[var(--splity-mint)]",
    rose: "text-[var(--splity-rose)]",
  }[tone];

  return (
    <div className="rounded-xl bg-white/70 p-3 text-center">
      <div className={` text-2xl font-bold ${toneClass}`}>{count}</div>
      <div className="mt-1 truncate text-[11px] font-semibold text-[var(--splity-muted)]">
        <T k={labelKey} />
      </div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow: ReactNode; title: ReactNode }) {
  return (
    <div>
      <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--splity-gold-strong)]" />
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--splity-ink)] sm:text-2xl">
        {title}
      </h2>
    </div>
  );
}

export function Panel({
  action,
  children,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  eyebrow: ReactNode;
  title: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <SectionTitle eyebrow={eyebrow} title={title} />
        {action}
      </div>
      {children}
    </section>
  );
}

export function AttentionCard({
  count,
  href,
  icon,
  label,
  tone,
}: {
  count: number;
  href: string;
  icon: ReactNode;
  label: ReactNode;
  tone: "gold" | "navy" | "rose";
}) {
  const toneClass = {
    gold: {
      button: "bg-[var(--splity-gold-strong)] text-white",
      icon: "bg-[rgba(233,177,66,0.22)] text-[var(--splity-gold-strong)]",
      wash: "bg-[rgba(233,177,66,0.09)]",
    },
    navy: {
      button: "bg-[var(--splity-navy)] text-white",
      icon: "bg-[rgba(27,42,107,0.12)] text-[var(--splity-navy)]",
      wash: "bg-[rgba(27,42,107,0.07)]",
    },
    rose: {
      button: "bg-[var(--splity-rose)] text-white",
      icon: "bg-[rgba(194,74,74,0.14)] text-[var(--splity-rose)]",
      wash: "bg-[rgba(194,74,74,0.07)]",
    },
  }[tone];

  return (
    <Link
      className="relative min-h-36 overflow-hidden rounded-[18px] border border-[var(--splity-line)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      href={href}
    >
      <span className={`absolute -right-8 -top-8 h-28 w-28 rounded-full ${toneClass.wash}`} />
      <div className="relative flex items-start justify-between gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneClass.icon}`}>
          {count > 0 ? icon : <CheckCircle2 className="h-5 w-5 text-[var(--splity-mint)]" />}
        </span>
        <span className="rounded-full bg-[color:var(--splity-bg)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--splity-ink)]">
          {count}
        </span>
      </div>
      <h3 className="relative mt-6  text-lg font-bold tracking-tight">{label}</h3>
      <span className={`relative mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${toneClass.button}`}>
        <T k="dashboard.review" />
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

export function ActiveGroupRow({
  bills,
  currentParticipantId,
  group,
  settlement,
}: {
  bills: BillSummary[];
  currentParticipantId?: string;
  group: GroupSummary;
  settlement: SettlementResultDto | null;
}) {
  const status = isGroupStatus(group.status) ? group.status : GROUP_STATUS.unresolved;
  const meta = getStatusMeta(status);
  const progress = settlementProgress(group, settlement);
  const currentBalance = currentParticipantId
    ? settlement?.netBalances.find((balance) => balance.participantId === currentParticipantId)?.netAmount
    : null;
  const participantLabels = (settlement?.participants ?? []).slice(0, 4);

  return (
    <LoadingLink
      className="grid gap-4 rounded-[14px] border border-[var(--splity-line)] bg-[color:var(--splity-bg)]/45 p-4 transition hover:border-[var(--splity-line-strong)] sm:grid-cols-[minmax(0,1.4fr)_minmax(150px,0.6fr)_120px] sm:items-center"
      href={`/groups/${group.id}`}
      loadingKey="groups.loadingDetail"
    >
      <div className="min-w-0">
        <h3 className="truncate  text-lg font-bold tracking-tight">{group.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex -space-x-1">
            {participantLabels.length ? (
              participantLabels.map((participant, index) => (
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[var(--splity-navy)]  text-[9px] font-bold text-white"
                  key={participant.id}
                  style={{ backgroundColor: ["#1b2a6b", "#c46920", "#2e8a5e", "#6b3ce7"][index % 4] }}
                >
                  {initials(participant.name)}
                </span>
              ))
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[var(--splity-navy)]  text-[9px] font-bold text-white">
                S
              </span>
            )}
          </div>
          <span className=" text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--splity-muted)]">
            <T
              k="dashboard.groupActivityMeta"
              values={{ bills: bills.length, participants: group.participantCount }}
            />
          </span>
          <Badge tone={meta.badgeTone}>
            <T k={meta.labelKey} />
          </Badge>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between  text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--splity-muted)]">
          <span><T k="dashboard.settledLabel" /></span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(12,21,56,0.08)]">
          <div
            className={`h-full rounded-full ${status === GROUP_STATUS.settled ? "bg-[var(--splity-mint)]" : "bg-[var(--splity-gold)]"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="sm:text-right">
        <div className=" text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--splity-muted)]">
          <T k="dashboard.yourBalance" />
        </div>
        <div
          className={[
            "mt-1  text-sm font-bold",
            Number(currentBalance ?? 0) > 0
              ? "text-[var(--splity-mint)]"
              : Number(currentBalance ?? 0) < 0
                ? "text-[var(--splity-rose)]"
                : "text-[var(--splity-ink)]",
          ].join(" ")}
        >
          {bills.length ? signedMoney(currentBalance ?? 0) : <T k="groups.noBills" />}
        </div>
      </div>
    </LoadingLink>
  );
}

export function SettlementQueueRow({
  currentParticipantId,
  group,
  settlement,
  transfer,
}: {
  currentParticipantId?: string;
  group: GroupSummary;
  settlement: SettlementResultDto | null;
  transfer: SettlementTransferDto;
}) {
  const participants = new Map((settlement?.participants ?? []).map((participant) => [participant.id, participant.name]));
  const from = participants.get(transfer.fromParticipantId) ?? "";
  const to = participants.get(transfer.toParticipantId) ?? "";
  const isCurrentPayer = currentParticipantId === transfer.fromParticipantId;
  const isCurrentReceiver = currentParticipantId === transfer.toParticipantId;
  const signedAmount = isCurrentReceiver ? Number(transfer.amount) : isCurrentPayer ? -Number(transfer.amount) : Number(transfer.amount);

  return (
    <Link
      className="grid gap-3 rounded-[14px] border border-[var(--splity-line)] bg-[color:var(--splity-bg)]/45 p-4 transition hover:border-[var(--splity-line-strong)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      href={`/groups/${group.id}/settlements`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--splity-navy)]  text-xs font-bold text-white">
          {initials(isCurrentPayer ? "Y" : from)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">
            {isCurrentPayer ? <T k="dashboard.you" /> : from || <T k="common.unknown" />} →{" "}
            {isCurrentReceiver ? <T k="dashboard.you" /> : to || <T k="common.unknown" />}
          </div>
          <div className="mt-1 truncate  text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--splity-muted)]">
            {group.name}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div
          className={[
            " text-sm font-bold",
            signedAmount >= 0 ? "text-[var(--splity-mint)]" : "text-[var(--splity-rose)]",
          ].join(" ")}
        >
          {signedMoney(signedAmount)}
        </div>
        <span className="inline-flex h-8 items-center rounded-full bg-white px-3  text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--splity-navy)]">
          {isCurrentPayer ? <T k="dashboard.payNow" /> : <T k="dashboard.remind" />}
        </span>
      </div>
    </Link>
  );
}

export function Metric({
  label,
  tone,
  value,
}: {
  label: ReactNode;
  tone?: "green" | "red";
  value: ReactNode;
}) {
  return (
    <div>
      <div className=" text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
        {label}
      </div>
      <div
        className={[
          "mt-1  text-xl font-bold",
          tone === "green" ? "text-[var(--splity-mint)]" : tone === "red" ? "text-[var(--splity-rose)]" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

export function WeeklyChart({ totals }: { totals: { label: string; total: number }[] }) {
  const max = Math.max(...totals.map((entry) => entry.total), 1);

  return (
    <div className="mt-7 grid h-44 grid-cols-8 items-end gap-2 rounded-2xl border border-[var(--splity-line)] bg-[color:var(--splity-bg)]/35 px-4 pb-7 pt-4">
      {totals.map((entry, index) => (
        <div className="relative flex h-full items-end" key={entry.label}>
          <div
            className={[
              "w-full rounded-t-md",
              index === totals.length - 1
                ? "bg-[linear-gradient(180deg,var(--splity-gold)_0%,var(--splity-gold-strong)_100%)]"
                : "bg-[var(--splity-navy)]",
            ].join(" ")}
            style={{ height: `${Math.max((entry.total / max) * 100, entry.total > 0 ? 8 : 2)}%` }}
          />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2  text-[10px] font-bold uppercase text-[var(--splity-muted)]">
            {entry.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SpendRow({
  color,
  label,
  max,
  value,
}: {
  color: string;
  label: string;
  max: number;
  value: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
        <span className="min-w-0 truncate">{label}</span>
        <span className=" text-xs">{money(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(12,21,56,0.08)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max((value / Math.max(max, 1)) * 100, 4)}%` }} />
      </div>
    </div>
  );
}
