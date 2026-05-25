import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Inbox, ReceiptText, Users } from "lucide-react";
import type { ReactNode } from "react";

import { T } from "@/components/i18n/t";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getAppUser, requireUser } from "@/lib/auth/server";
import type { BillSummary } from "@/lib/calculations/bill-read-projection";
import { listBills } from "@/lib/services/bills";
import {
  GROUP_STATUS,
  isGroupStatus,
  listAccessibleGroupSummaries,
  type GroupSummary,
} from "@/lib/services/groups";
import { listMyInvitations } from "@/lib/services/invitations";
import { getSettlement, type SettlementResultDto, type SettlementTransferDto } from "@/lib/services/settlements";

type StatusMeta = {
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

function getStatusMeta(status: number) {
  return statusMeta[status] ?? statusMeta[GROUP_STATUS.unresolved];
}

function countByStatus(groups: GroupSummary[], status: number) {
  return groups.filter((group) => (isGroupStatus(group.status) ? group.status : 0) === status).length;
}

function money(value: number | string, currency = "RM") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency} 0.00`;
  return `${currency} ${Math.abs(amount).toFixed(2)}`;
}

function signedMoney(value: number | string, currency = "RM") {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return `${currency} 0.00`;
  return `${amount > 0 ? "+" : "-"}${money(amount, currency)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";
}

function findCurrentParticipantId(
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

function settlementProgress(group: GroupSummary, settlement: SettlementResultDto | null) {
  const status = isGroupStatus(group.status) ? group.status : GROUP_STATUS.unresolved;
  if (status === GROUP_STATUS.settled) return 100;
  if (status === GROUP_STATUS.unresolved) return 0;
  if (!settlement?.transfers.length) return 100;

  const completed = settlement.transfers.filter((transfer) => transfer.status === 2).length;
  return Math.round((completed / settlement.transfers.length) * 100);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [appUser, groups, invitations] = await Promise.all([
    getAppUser(),
    listAccessibleGroupSummaries(),
    listMyInvitations().catch(() => []),
  ]);
  const [billEntries, settlementEntries] = await Promise.all([
    Promise.all(groups.map(async (group) => [group.id, await listBills(group.id).catch(() => [])] as const)),
    Promise.all(
      groups.slice(0, 8).map(async (group) => ({
        group,
        settlement: await getSettlement(group.id).catch(() => null),
      }))
    ),
  ]);

  const displayName = appUser?.name || appUser?.username || user.email || "Splity";
  const unresolvedCount = countByStatus(groups, GROUP_STATUS.unresolved);
  const settlingCount = countByStatus(groups, GROUP_STATUS.settling);
  const settledCount = countByStatus(groups, GROUP_STATUS.settled);
  const billCount = groups.reduce((sum, group) => sum + group.billCount, 0);
  const participantCount = groups.reduce((sum, group) => sum + group.participantCount, 0);
  const emptyBillGroups = groups.filter((group) => group.billCount === 0).length;
  const billsByGroup = new Map(billEntries);
  const settlementsByGroup = new Map(settlementEntries.map((entry) => [entry.group.id, entry.settlement]));
  const allBills = billEntries.flatMap(([, bills]) => bills);
  const activeGroups = groups.slice(0, 4);
  const settlementRows = settlementEntries
    .flatMap((entry) =>
      (entry.settlement?.transfers ?? []).map((transfer) => ({
        group: entry.group,
        settlement: entry.settlement,
        transfer,
      }))
    )
    .slice(0, 4);
  const currentParticipantByGroup = new Map(
    settlementEntries.map((entry) => [
      entry.group.id,
      findCurrentParticipantId(entry.settlement, {
        name: appUser?.name,
        userId: user.id,
        username: appUser?.username,
      }),
    ])
  );
  const currentWeekStart = new Date();
  currentWeekStart.setHours(0, 0, 0, 0);
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
  const weeklyTotals = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(currentWeekStart);
    start.setDate(currentWeekStart.getDate() - (7 - index) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const total = allBills
      .filter((bill) => {
        const date = new Date(bill.transactionDateUtc);
        return date >= start && date < end;
      })
      .reduce((sum, bill) => sum + Number(bill.grandTotalAmount), 0);

    return { label: index === 7 ? "THIS" : `W${index + 1}`, total };
  });
  const previousTotal = allBills
    .filter((bill) => {
      const date = new Date(bill.transactionDateUtc);
      const previousStart = new Date(currentWeekStart);
      previousStart.setDate(currentWeekStart.getDate() - 16 * 7);
      const previousEnd = new Date(currentWeekStart);
      previousEnd.setDate(currentWeekStart.getDate() - 8 * 7);
      return date >= previousStart && date < previousEnd;
    })
    .reduce((sum, bill) => sum + Number(bill.grandTotalAmount), 0);
  const totalSpent = allBills.reduce((sum, bill) => sum + Number(bill.grandTotalAmount), 0);
  const averageWeek = totalSpent / 8;
  const delta = previousTotal > 0 ? ((totalSpent - previousTotal) / previousTotal) * 100 : 0;
  const groupSpendRows = groups
    .map((group) => ({
      group,
      total: (billsByGroup.get(group.id) ?? []).reduce((sum, bill) => sum + Number(bill.grandTotalAmount), 0),
    }))
    .filter((row) => row.total > 0)
    .sort((left, right) => right.total - left.total)
    .slice(0, 5);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-[var(--splity-mono)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--splity-muted)]">
            {appUser?.username ? `@${appUser.username}` : user.email}
          </p>
          <h1 className="mt-2 font-[var(--splity-display)] text-4xl font-bold tracking-tight text-[var(--splity-ink)]">
            <T k="dashboard.greeting" />{" "}
            <span className="font-[var(--splity-serif)] font-normal italic text-[var(--splity-navy)]">
              {displayName}
            </span>
          </h1>
        </div>
      </header>

      <section className="rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_24px_50px_rgba(12,21,56,0.06)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--splity-gold-strong)]" />
            <T k="dashboard.summary" />
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative overflow-hidden rounded-[18px] border border-[rgba(27,42,107,0.16)] bg-[linear-gradient(180deg,#E9EFFF_0%,#D7E1FF_100%)] p-5">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
              <T k="dashboard.totalGroups" />
            </span>
            <div className="mt-5 flex items-end justify-between gap-3">
              <span className="font-[var(--splity-display)] text-6xl font-bold leading-none text-[var(--splity-navy)]">
                {groups.length}
              </span>
              <Users className="h-6 w-6 text-[var(--splity-navy)]/55" />
            </div>
          </div>
          <div className="rounded-[18px] border border-[var(--splity-line)] bg-[color:var(--splity-bg)]/60 p-5">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
              <T k="dashboard.needsAttention" />
            </span>
            <div className="mt-5 flex items-end justify-between gap-3">
              <span className="font-[var(--splity-display)] text-5xl font-bold leading-none text-[var(--splity-rose)]">
                {unresolvedCount + invitations.length}
              </span>
              <AlertCircle className="h-6 w-6 text-[var(--splity-rose)]/70" />
            </div>
            <p className="mt-3 text-sm text-[var(--splity-muted)]">
              <T k="dashboard.unresolvedAndInvites" values={{ groups: unresolvedCount, invites: invitations.length }} />
            </p>
          </div>
          <div className="rounded-[18px] border border-[var(--splity-line)] bg-[color:var(--splity-bg)]/60 p-5">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
              <T k="dashboard.trackedBills" />
            </span>
            <div className="mt-5 flex items-end justify-between gap-3">
              <span className="font-[var(--splity-display)] text-5xl font-bold leading-none text-[var(--splity-ink)]">
                {billCount}
              </span>
              <ReceiptText className="h-6 w-6 text-[var(--splity-muted)]" />
            </div>
            <p className="mt-3 text-sm text-[var(--splity-muted)]">
              <T k="dashboard.acrossParticipants" values={{ count: participantCount }} />
            </p>
          </div>
          <div className="rounded-[18px] border border-[var(--splity-line)] bg-[color:var(--splity-bg)]/60 p-5">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
              <T k="dashboard.settlementState" />
            </span>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <StatusCount count={unresolvedCount} labelKey="groups.status.unresolved" tone="rose" />
              <StatusCount count={settlingCount} labelKey="groups.status.settling" tone="gold" />
              <StatusCount count={settledCount} labelKey="groups.status.settled" tone="mint" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <AttentionCard
          count={unresolvedCount}
          href="/dashboard"
          icon={<AlertCircle className="h-5 w-5" />}
          label={<T k="dashboard.unresolvedGroupsShort" />}
          tone="rose"
        />
        <AttentionCard
          count={invitations.length}
          href="/invitations"
          icon={<Clock3 className="h-5 w-5" />}
          label={<T k="dashboard.pendingInvitesShort" />}
          tone="gold"
        />
        <AttentionCard
          count={emptyBillGroups}
          href="/dashboard"
          icon={<Inbox className="h-5 w-5" />}
          label={<T k="dashboard.emptyBillGroupsShort" />}
          tone="navy"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
        <Panel
          action={
            <Link className="text-xs font-bold text-[var(--splity-navy)]" href="/dashboard">
              <T k="dashboard.allGroups" /> →
            </Link>
          }
          eyebrow={<T k="dashboard.activeGroups" />}
          title={
            <>
              <T k="dashboard.whereMoneyIs" />{" "}
              <span className="font-[var(--splity-serif)] font-normal italic text-[var(--splity-navy)]">
                <T k="dashboard.inMotionShort" />
              </span>
            </>
          }
        >
          {activeGroups.length ? (
            <div className="grid gap-3">
              {activeGroups.map((group) => (
                <ActiveGroupRow
                  bills={billsByGroup.get(group.id) ?? []}
                  currentParticipantId={currentParticipantByGroup.get(group.id)}
                  group={group}
                  key={group.id}
                  settlement={settlementsByGroup.get(group.id) ?? null}
                />
              ))}
            </div>
          ) : (
            <EmptyState description={<T k="dashboard.noGroupsBody" />} title={<T k="dashboard.noGroupsTitle" />} />
          )}
        </Panel>

        <Panel
          eyebrow={<T k="dashboard.settlementQueue" />}
          title={
            <>
              <T k="dashboard.whoPays" />{" "}
              <span className="font-[var(--splity-serif)] font-normal italic text-[var(--splity-navy)]">
                <T k="dashboard.whom" />
              </span>
            </>
          }
        >
          {settlementRows.length ? (
            <div className="grid gap-3">
              {settlementRows.map((row) => (
                <SettlementQueueRow
                  currentParticipantId={currentParticipantByGroup.get(row.group.id)}
                  group={row.group}
                  key={`${row.group.id}-${row.transfer.transferKey}`}
                  settlement={row.settlement}
                  transfer={row.transfer}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--splity-line-strong)] p-6 text-center text-sm font-semibold text-[var(--splity-muted)]">
              <T k="dashboard.noSettlementQueue" />
            </div>
          )}
        </Panel>
      </section>

      <section className="grid gap-4 rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)] sm:p-6">
        <div>
          <SectionTitle
            eyebrow={<T k="dashboard.spendingInsights" />}
            title={
              <>
                <T k="dashboard.lastEightWeeks" />{" "}
                <span className="font-[var(--splity-serif)] font-normal italic text-[var(--splity-navy)]">
                  <T k="dashboard.atAGlance" />
                </span>
              </>
            }
          />
          <div className="mt-4 flex flex-wrap gap-8">
            <Metric label={<T k="dashboard.totalSpent" />} value={money(totalSpent)} />
            <Metric
              label={<T k="dashboard.vsPrevious" />}
              tone={delta >= 0 ? "green" : "red"}
              value={`${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}
            />
            <Metric label={<T k="dashboard.averageWeek" />} value={money(averageWeek)} />
          </div>
          <WeeklyChart totals={weeklyTotals} />
        </div>

        <div>
          <SectionTitle
            eyebrow={<T k="dashboard.categories" />}
            title={<T k="dashboard.whereItWent" />}
          />
          <div className="mt-5 grid gap-4">
            {groupSpendRows.length ? (
              groupSpendRows.map((row, index) => (
                <SpendRow
                  color={["bg-[#c46920]", "bg-[#6b3ce7]", "bg-[var(--splity-navy)]", "bg-[var(--splity-mint)]", "bg-[#5a6079]"][index]}
                  key={row.group.id}
                  label={row.group.name}
                  max={groupSpendRows[0]?.total ?? row.total}
                  value={row.total}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--splity-line-strong)] p-6 text-sm font-semibold text-[var(--splity-muted)]">
                <T k="dashboard.insightsUnavailable" />
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

function StatusCount({
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
      <div className={`font-[var(--splity-display)] text-2xl font-bold ${toneClass}`}>{count}</div>
      <div className="mt-1 truncate text-[11px] font-semibold text-[var(--splity-muted)]">
        <T k={labelKey} />
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: ReactNode; title: ReactNode }) {
  return (
    <div>
      <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--splity-gold-strong)]" />
        {eyebrow}
      </p>
      <h2 className="mt-2 font-[var(--splity-display)] text-2xl font-bold tracking-tight text-[var(--splity-ink)]">
        {title}
      </h2>
    </div>
  );
}

function Panel({
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
    <section className="rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <SectionTitle eyebrow={eyebrow} title={title} />
        {action}
      </div>
      {children}
    </section>
  );
}

function AttentionCard({
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
        <span className="rounded-full bg-[color:var(--splity-bg)] px-2.5 py-1 font-[var(--splity-mono)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--splity-ink)]">
          {count}
        </span>
      </div>
      <h3 className="relative mt-6 font-[var(--splity-display)] text-lg font-bold tracking-tight">{label}</h3>
      <span className={`relative mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${toneClass.button}`}>
        <T k="dashboard.review" />
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function ActiveGroupRow({
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
    <Link
      className="grid gap-4 rounded-[14px] border border-[var(--splity-line)] bg-[color:var(--splity-bg)]/45 p-4 transition hover:border-[var(--splity-line-strong)] sm:grid-cols-[minmax(0,1.4fr)_minmax(150px,0.6fr)_120px] sm:items-center"
      href={`/groups/${group.id}`}
    >
      <div className="min-w-0">
        <h3 className="truncate font-[var(--splity-display)] text-lg font-bold tracking-tight">{group.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex -space-x-1">
            {participantLabels.length ? (
              participantLabels.map((participant, index) => (
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[var(--splity-navy)] font-[var(--splity-display)] text-[9px] font-bold text-white"
                  key={participant.id}
                  style={{ backgroundColor: ["#1b2a6b", "#c46920", "#2e8a5e", "#6b3ce7"][index % 4] }}
                >
                  {initials(participant.name)}
                </span>
              ))
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[var(--splity-navy)] font-[var(--splity-display)] text-[9px] font-bold text-white">
                S
              </span>
            )}
          </div>
          <span className="font-[var(--splity-mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--splity-muted)]">
            {group.participantCount} PPL · {bills.length} BILLS
          </span>
          <Badge tone={meta.badgeTone}>
            <T k={meta.labelKey} />
          </Badge>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between font-[var(--splity-mono)] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--splity-muted)]">
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
        <div className="font-[var(--splity-mono)] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--splity-muted)]">
          <T k="dashboard.yourBalance" />
        </div>
        <div
          className={[
            "mt-1 font-[var(--splity-mono)] text-sm font-bold",
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
    </Link>
  );
}

function SettlementQueueRow({
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
  const from = participants.get(transfer.fromParticipantId) ?? "Unknown";
  const to = participants.get(transfer.toParticipantId) ?? "Unknown";
  const isCurrentPayer = currentParticipantId === transfer.fromParticipantId;
  const isCurrentReceiver = currentParticipantId === transfer.toParticipantId;
  const signedAmount = isCurrentReceiver ? Number(transfer.amount) : isCurrentPayer ? -Number(transfer.amount) : Number(transfer.amount);

  return (
    <Link
      className="grid gap-3 rounded-[14px] border border-[var(--splity-line)] bg-[color:var(--splity-bg)]/45 p-4 transition hover:border-[var(--splity-line-strong)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      href={`/groups/${group.id}/settlements`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--splity-navy)] font-[var(--splity-display)] text-xs font-bold text-white">
          {initials(isCurrentPayer ? "You" : from)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">
            {isCurrentPayer ? "You" : from} → {isCurrentReceiver ? "You" : to}
          </div>
          <div className="mt-1 truncate font-[var(--splity-mono)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--splity-muted)]">
            {group.name}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div
          className={[
            "font-[var(--splity-mono)] text-sm font-bold",
            signedAmount >= 0 ? "text-[var(--splity-mint)]" : "text-[var(--splity-rose)]",
          ].join(" ")}
        >
          {signedMoney(signedAmount)}
        </div>
        <span className="inline-flex h-8 items-center rounded-full bg-white px-3 font-[var(--splity-mono)] text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--splity-navy)]">
          {isCurrentPayer ? <T k="dashboard.payNow" /> : <T k="dashboard.remind" />}
        </span>
      </div>
    </Link>
  );
}

function Metric({
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
      <div className="font-[var(--splity-mono)] text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
        {label}
      </div>
      <div
        className={[
          "mt-1 font-[var(--splity-display)] text-xl font-bold",
          tone === "green" ? "text-[var(--splity-mint)]" : tone === "red" ? "text-[var(--splity-rose)]" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function WeeklyChart({ totals }: { totals: { label: string; total: number }[] }) {
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
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-[var(--splity-mono)] text-[10px] font-bold uppercase text-[var(--splity-muted)]">
            {entry.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function SpendRow({
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
        <span className="font-[var(--splity-mono)] text-xs">{money(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(12,21,56,0.08)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max((value / Math.max(max, 1)) * 100, 4)}%` }} />
      </div>
    </div>
  );
}
