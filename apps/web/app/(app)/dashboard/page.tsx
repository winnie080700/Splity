import Link from "next/link";
import { AlertCircle, Clock3, Inbox, ReceiptText, Users } from "lucide-react";

import { T } from "@/components/i18n/t";
import { EmptyState } from "@/components/ui/empty-state";
import { getAppUser, requireUser } from "@/lib/auth/server";
import { listBills } from "@/lib/services/bills";
import { GROUP_STATUS, listAccessibleGroupSummaries } from "@/lib/services/groups";
import { listMyInvitations } from "@/lib/services/invitations";
import { getSettlement } from "@/lib/services/settlements";
import {
  ActiveGroupRow,
  AttentionCard,
  Metric,
  Panel,
  SectionTitle,
  SettlementQueueRow,
  SpendRow,
  StatusCount,
  WeeklyChart,
} from "./dashboard-components";
import { countByStatus, findCurrentParticipantId, money } from "./dashboard-utils";

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
          <p className=" text-xs uppercase tracking-[0.12em] text-[var(--splity-muted)]">
            {appUser?.username ? `@${appUser.username}` : user.email}
          </p>
          <h1 className="mt-2  font-bold text-4xl tracking-tight text-[var(--splity-ink)]">
            <T k="dashboard.greeting" />{" "}
            <span className="font-normal italic text-[var(--splity-navy)]">
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
              <span className=" text-6xl font-bold leading-none text-[var(--splity-navy)]">
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
              <span className=" text-5xl font-bold leading-none text-[var(--splity-rose)]">
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
              <span className=" text-5xl font-bold leading-none text-[var(--splity-ink)]">
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
              <span className="font-normal italic text-[var(--splity-navy)]">
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
              <span className="font-normal italic text-[var(--splity-navy)]">
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
                <span className="font-normal italic text-[var(--splity-navy)]">
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
