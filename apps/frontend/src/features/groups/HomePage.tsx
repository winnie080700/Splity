import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  type BillDetailDto,
  type BillSummaryDto,
  type GroupSummaryDto,
  type ParticipantDto,
  type ParticipantNetBalanceDto,
  type SettlementResultDto
} from "@api-client";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DashboardFinancialCard,
  DashboardInsightCard,
  DashboardSection,
  DashboardSignalPill
} from "@/features/groups/dashboard/DashboardSection";
import { isSettlementReceived } from "@/features/settlements/status";
import { useAuth } from "@/shared/auth/AuthProvider";
import { formatGroupCreatedAt } from "@/shared/groups/groupMeta";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ArrowsIcon, CalendarIcon, ReceiptIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { InlineMessage, LoadingState } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/toast";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";

type DashboardRange = "month" | "year";

type DashboardBillItem = {
  group: GroupSummaryDto;
  bill: BillSummaryDto;
};

type MatchedSettlementGroup = {
  group: GroupSummaryDto;
  matchedBalance: ParticipantNetBalanceDto;
  netAmount: number;
  outgoingAmount: number;
  incomingAmount: number;
};

type DashboardGroupContext = {
  group: GroupSummaryDto;
  bills: BillSummaryDto[];
  totalBillAmount: number;
  settlement: SettlementResultDto | null;
  participants: ParticipantDto[];
  matchedBalance: ParticipantNetBalanceDto | null;
  matchedParticipant: ParticipantDto | null;
  memberCount: number | null;
  latestBill: BillSummaryDto | null;
  lastActivityAt: string;
  unsettledAmount: number;
  pendingTransferCount: number;
};

type DashboardActivityFeedItem = {
  id: string;
  title: string;
  description: string;
  meta: string;
  to: string;
  badge?: {
    label: string;
    tone: "warning" | "positive" | "brand";
  };
  icon: "bill" | "payment" | "group" | "settlement";
  activityAt: string;
};

type DashboardInsight = {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: "wallet" | "receipt" | "users" | "calendar";
};

function getDashboardRange(period: DashboardRange) {
  const now = new Date();
  const start =
    period === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), 0, 1);

  return {
    start,
    end: now,
    fromDate: start.toISOString(),
    toDate: now.toISOString()
  };
}

function isDateInRange(value: string, start: Date, end: Date) {
  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

function normalizeParticipantName(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ").replace(/^@/, "") ?? "";
}

function getUserMatchCandidates(user: ReturnType<typeof useAuth>["user"]) {
  const localPart = user?.email?.split("@")[0] ?? null;

  return Array.from(
    new Set(
      [user?.name, user?.username, localPart]
        .map((value) => normalizeParticipantName(value ?? undefined))
        .filter(Boolean)
    )
  );
}

function getMatchedNetBalance(result: SettlementResultDto | null | undefined, candidates: string[]) {
  if (!result || candidates.length === 0) {
    return null;
  }

  const matches = result.netBalances.filter((balance) =>
    candidates.includes(normalizeParticipantName(balance.participantName))
  );

  return matches.length === 1 ? matches[0] : null;
}

function getMatchedParticipant(participants: ParticipantDto[] | null | undefined, candidates: string[]) {
  if (!participants || candidates.length === 0) {
    return null;
  }

  const matches = participants.filter((participant) =>
    candidates.includes(normalizeParticipantName(participant.name))
  );

  return matches.length === 1 ? matches[0] : null;
}

function getLatestBill(bills: BillSummaryDto[]) {
  return bills.reduce<BillSummaryDto | null>((latest, bill) => {
    if (!latest) {
      return bill;
    }

    return new Date(bill.transactionDateUtc).getTime() > new Date(latest.transactionDateUtc).getTime()
      ? bill
      : latest;
  }, null);
}

function getBillRelationship(detail: BillDetailDto | null | undefined, participantId: string | null | undefined) {
  if (!detail || !participantId) {
    return null;
  }

  const shareAmount = detail.shares.find((share) => share.participantId === participantId)?.totalShareAmount ?? 0;
  const contributionAmount =
    detail.contributions.find((contribution) => contribution.participantId === participantId)?.amount ?? 0;

  if (participantId === detail.primaryPayerParticipantId && contributionAmount > 0) {
    return "paid" as const;
  }

  if (shareAmount > contributionAmount + 0.005) {
    return "owe" as const;
  }

  if (shareAmount > 0 || contributionAmount > 0) {
    return "shared" as const;
  }

  return null;
}

function formatSignedCurrency(value: number) {
  if (Math.abs(value) < 0.005) {
    return formatCurrency(0);
  }

  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatCurrency(Math.abs(value))}`;
}

function getContinuePath(group: GroupSummaryDto) {
  return `/groups/${group.id}/overview`;
}

function buildBillsPath(groupId: string) {
  return `/groups/${groupId}/bills#create-bill`;
}

function buildSettlementsPath(groupId: string) {
  return `/groups/${groupId}/settlements`;
}

function renderFinancialCardsSkeleton() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`financial-skeleton:${index}`} className="dashboard-financial-card animate-pulse">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-3 w-20 rounded-full bg-[#e8dfcf]" />
              <div className="mt-4 h-10 w-28 rounded-full bg-[#ece4d6]" />
            </div>
            <div className="h-12 w-12 shrink-0 rounded-[18px] bg-[rgba(255,255,255,0.72)]" />
          </div>
          <div className="mt-6 flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-full max-w-[14rem] rounded-full bg-[#ede4d6]" />
              <div className="h-3 w-24 rounded-full bg-[#ede4d6]" />
            </div>
            <div className="h-11 w-14 shrink-0 rounded-[16px] bg-[rgba(255,255,255,0.78)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function renderInsightsSkeleton() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={`insight-skeleton:${index}`} className="dashboard-insight-card animate-pulse">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-3 w-24 rounded-full bg-[#e8dfcf]" />
              <div className="mt-2 h-7 w-20 rounded-full bg-[#ece4d6]" />
            </div>
            <div className="h-10 w-10 shrink-0 rounded-[16px] bg-[rgba(255,255,255,0.72)]" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded-full bg-[#ede4d6]" />
            <div className="h-3 w-4/5 rounded-full bg-[#ede4d6]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardRange>("month");

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiClient.listGroups()
  });

  const groups = groupsQuery.data ?? [];
  const range = useMemo(() => getDashboardRange(period), [period]);

  const billQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ["dashboard", "bills", group.id, period, range.fromDate, range.toDate],
      queryFn: () =>
        apiClient.listBills(group.id, {
          fromDate: range.fromDate,
          toDate: range.toDate
        }),
      enabled: groups.length > 0
    }))
  });

  const settlementQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ["dashboard", "settlements", group.id, period, range.fromDate, range.toDate],
      queryFn: () =>
        apiClient.getSettlements(group.id, {
          fromDate: range.fromDate,
          toDate: range.toDate
        }),
      enabled: groups.length > 0
    }))
  });

  const participantQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ["dashboard", "participants", group.id],
      queryFn: () => apiClient.listParticipants(group.id),
      enabled: groups.length > 0
    }))
  });

  const isBillsLoading = groups.length > 0 && billQueries.some((query) => query.isPending);
  const isSettlementLoading = groups.length > 0 && settlementQueries.some((query) => query.isPending);
  const billQueryError = billQueries.find((query) => query.isError)?.error ?? null;
  const userMatchCandidates = useMemo(() => getUserMatchCandidates(user), [user]);

  const groupContexts = useMemo<DashboardGroupContext[]>(() => {
    return groups.map((group, index) => {
      const bills = billQueries[index]?.data ?? [];
      const settlement = settlementQueries[index]?.data ?? null;
      const participants = participantQueries[index]?.data ?? [];
      const matchedBalance = getMatchedNetBalance(settlement, userMatchCandidates);
      const matchedParticipant =
        getMatchedParticipant(participants, userMatchCandidates) ??
        (matchedBalance ? participants.find((participant) => participant.id === matchedBalance.participantId) ?? null : null);
      const latestBill = getLatestBill(bills);
      const pendingTransfers = (settlement?.transfers ?? []).filter(
        (transfer) => !isSettlementReceived(transfer.status)
      );
      const totalBillAmount = bills.reduce((sum, bill) => sum + bill.grandTotalAmount, 0);

      return {
        group,
        bills,
        totalBillAmount,
        settlement,
        participants,
        matchedBalance,
        matchedParticipant,
        memberCount: participantQueries[index]?.data ? participants.length : null,
        latestBill,
        lastActivityAt: latestBill?.transactionDateUtc ?? group.createdAtUtc,
        unsettledAmount: pendingTransfers.reduce((sum, transfer) => sum + transfer.amount, 0),
        pendingTransferCount: pendingTransfers.length
      };
    });
  }, [billQueries, groups, participantQueries, settlementQueries, userMatchCandidates]);

  const matchedSettlementGroups = useMemo<MatchedSettlementGroup[]>(() => {
    return groupContexts.flatMap(({ group, settlement, matchedBalance }) => {
      if (!settlement || !matchedBalance) {
        return [];
      }

      const outgoingAmount = settlement.transfers
        .filter(
          (transfer) =>
            transfer.fromParticipantId === matchedBalance.participantId && !isSettlementReceived(transfer.status)
        )
        .reduce((sum, transfer) => sum + transfer.amount, 0);

      const incomingAmount = settlement.transfers
        .filter(
          (transfer) =>
            transfer.toParticipantId === matchedBalance.participantId && !isSettlementReceived(transfer.status)
        )
        .reduce((sum, transfer) => sum + transfer.amount, 0);

      return [
        {
          group,
          matchedBalance,
          netAmount: matchedBalance.netAmount,
          outgoingAmount,
          incomingAmount
        }
      ];
    });
  }, [groupContexts]);

  const unsettledGroupsCount = groups.filter((group) => group.status !== "settled").length;
  const groupContextById = useMemo(() => new Map(groupContexts.map((context) => [context.group.id, context])), [groupContexts]);
  const recentBills = useMemo<DashboardBillItem[]>(() => {
    return groupContexts
      .flatMap(({ group, bills }) => bills.map((bill) => ({ group, bill })))
      .sort(
        (left, right) =>
          new Date(right.bill.transactionDateUtc).getTime() - new Date(left.bill.transactionDateUtc).getTime()
      )
      .slice(0, 10);
  }, [groupContexts]);

  const billDetailQueries = useQueries({
    queries: recentBills.map(({ group, bill }) => ({
      queryKey: ["dashboard", "bill-detail", group.id, bill.id],
      queryFn: () => apiClient.getBill(group.id, bill.id),
      enabled: recentBills.length > 0
    }))
  });

  const totalBillsCount = groupContexts.reduce((sum, context) => sum + context.bills.length, 0);
  const totalBillSpend = groupContexts.reduce((sum, context) => sum + context.totalBillAmount, 0);
  const averageBillSize = totalBillsCount > 0 ? totalBillSpend / totalBillsCount : 0;
  const topSpendingGroup = groupContexts.reduce<DashboardGroupContext | null>((highest, context) => {
    if (context.totalBillAmount <= 0) {
      return highest;
    }

    if (!highest || context.totalBillAmount > highest.totalBillAmount) {
      return context;
    }

    return highest;
  }, null);
  const highestUnsettledGroup = groupContexts.reduce<DashboardGroupContext | null>((highest, context) => {
    if (context.unsettledAmount <= 0) {
      return highest;
    }

    if (!highest || context.unsettledAmount > highest.unsettledAmount) {
      return context;
    }

    return highest;
  }, null);

  const dashboardInsights = useMemo<DashboardInsight[]>(() => {
    return [
      {
        id: "top-spending",
        label: t("dashboard.insightTopSpendingGroup"),
        value: topSpendingGroup?.group.name ?? "—",
        detail: topSpendingGroup
          ? `${formatCurrency(topSpendingGroup.totalBillAmount)} · ${t("dashboard.billCountLabel")}: ${String(topSpendingGroup.bills.length)}`
          : t("dashboard.insightNoSpendData"),
        icon: "wallet"
      },
      {
        id: "bills-period",
        label: t("dashboard.insightTotalBills"),
        value: String(totalBillsCount),
        detail:
          totalBillsCount > 0
            ? `${t("dashboard.rangeLabel")} ${period === "month" ? t("dashboard.rangeMonth") : t("dashboard.rangeYear")}`
            : t("dashboard.insightNoBillsData"),
        icon: "receipt"
      },
      {
        id: "total-spend",
        label: t("dashboard.totalSpend"),
        value: formatCurrency(totalBillSpend),
        detail:
          totalBillsCount > 0
            ? `${t("dashboard.insightTotalBills")}: ${String(totalBillsCount)}`
            : t("dashboard.insightNoBillsData"),
        icon: "wallet"
      },
      {
        id: "avg-bill",
        label: t("dashboard.insightAverageBill"),
        value: totalBillsCount > 0 ? formatCurrency(averageBillSize) : "—",
        detail:
          totalBillsCount > 0
            ? t("dashboard.insightAverageBillBody")
            : t("dashboard.insightNoBillsData"),
        icon: "calendar"
      },
      {
        id: "highest-unsettled",
        label: t("dashboard.insightHighestUnsettled"),
        value: highestUnsettledGroup?.group.name ?? t("dashboard.allSettledShort"),
        detail: highestUnsettledGroup
          ? `${formatCurrency(highestUnsettledGroup.unsettledAmount)} · ${t("dashboard.pendingItemsLabel")}: ${String(highestUnsettledGroup.pendingTransferCount)}`
          : t("dashboard.insightAllSettledBody"),
        icon: "users"
      }
    ];
  }, [
    averageBillSize,
    highestUnsettledGroup,
    period,
    t,
    topSpendingGroup,
    totalBillSpend,
    totalBillsCount
  ]);

  const recentActivityFeed = useMemo<DashboardActivityFeedItem[]>(() => {
    const items: DashboardActivityFeedItem[] = [];

    recentBills.forEach(({ group, bill }, index) => {
      const groupContext = groupContextById.get(group.id) ?? null;
      const detail = billDetailQueries[index]?.data ?? null;
      const relationship = getBillRelationship(detail, groupContext?.matchedParticipant?.id ?? null);

      items.push({
        id: `activity-bill:${group.id}:${bill.id}`,
        title:
          relationship === "paid"
            ? `${t("dashboard.activityYouPaid")} ${formatCurrency(bill.grandTotalAmount)}`
            : t("dashboard.activityBillAdded"),
        description: `${bill.storeName} · ${group.name}`,
        meta: formatDate(bill.transactionDateUtc, language),
        to: buildBillsPath(group.id),
        badge: relationship === "paid"
          ? { label: t("dashboard.billRelationYouPaid"), tone: "positive" }
          : { label: t("dashboard.activityBadgeBill"), tone: "brand" },
        icon: relationship === "paid" ? "payment" : "bill",
        activityAt: bill.transactionDateUtc
      });
    });

    groupContexts.forEach((context) => {
      if (isDateInRange(context.group.createdAtUtc, range.start, range.end)) {
        items.push({
          id: `activity-group:${context.group.id}`,
          title: t("dashboard.activityGroupCreated"),
          description: context.group.name,
          meta: formatGroupCreatedAt(context.group.createdAtUtc, language),
          to: getContinuePath(context.group),
          badge: { label: t("dashboard.activityBadgeGroup"), tone: "brand" },
          icon: "group",
          activityAt: context.group.createdAtUtc
        });
      }

      if (context.pendingTransferCount > 0) {
        items.push({
          id: `activity-settlement:${context.group.id}`,
          title: t("dashboard.activitySettlementOpen"),
          description: `${context.group.name} · ${formatCurrency(context.unsettledAmount)}`,
          meta: formatGroupCreatedAt(context.lastActivityAt, language),
          to: buildSettlementsPath(context.group.id),
          badge: { label: t("dashboard.attentionPillUrgent"), tone: "warning" },
          icon: "settlement",
          activityAt: context.lastActivityAt
        });
      }
    });

    return items
      .sort((left, right) => new Date(right.activityAt).getTime() - new Date(left.activityAt).getTime())
      .filter((item, index, array) => array.findIndex((entry) => entry.id === item.id) === index)
      .slice(0, 10);
  }, [billDetailQueries, groupContextById, groupContexts, language, range.end, range.start, recentBills, t]);

  const totalNetBalance = matchedSettlementGroups.reduce((sum, item) => sum + item.netAmount, 0);
  const totalOutstandingOwe = matchedSettlementGroups.reduce((sum, item) => sum + item.outgoingAmount, 0);
  const totalOutstandingOwed = matchedSettlementGroups.reduce((sum, item) => sum + item.incomingAmount, 0);
  const canShowPersonalFinancials = matchedSettlementGroups.length > 0;
  const [stableRecentActivityState, setStableRecentActivityState] = useState<{
    signature: string;
    items: DashboardActivityFeedItem[];
  }>({
    signature: "",
    items: []
  });
  const recentActivitySignature = useMemo(
    () => recentActivityFeed.map((item) => `${item.id}|${item.activityAt}|${item.meta}`).join("||"),
    [recentActivityFeed]
  );

  useEffect(() => {
    if (groupsQuery.isPending || groupsQuery.isError || isBillsLoading || isSettlementLoading || billQueryError) {
      return;
    }

    setStableRecentActivityState((current) => (
      current.signature === recentActivitySignature
        ? current
        : {
            signature: recentActivitySignature,
            items: recentActivityFeed
          }
    ));
  }, [
    billQueryError,
    groupsQuery.isError,
    groupsQuery.isPending,
    isBillsLoading,
    isSettlementLoading,
    recentActivitySignature,
    recentActivityFeed
  ]);

  function handleRetryDashboardData() {
    void groupsQuery.refetch();
    void queryClient.refetchQueries({ queryKey: ["dashboard", "bills"], type: "active" });
    void queryClient.refetchQueries({ queryKey: ["dashboard", "settlements"], type: "active" });
    void queryClient.refetchQueries({ queryKey: ["dashboard", "participants"], type: "active" });
    void queryClient.refetchQueries({ queryKey: ["dashboard", "bill-detail"], type: "active" });
  }

  function renderRetryAction() {
    return (
      <button className="workspace-shell-trigger" onClick={handleRetryDashboardData} type="button">
        {t("common.retry")}
      </button>
    );
  }

  function renderDashboardError(error: unknown) {
    return (
      <InlineMessage
        tone="error"
        title={t("feedback.loadFailed")}
        action={renderRetryAction()}
      >
        {getErrorMessage(error)}
      </InlineMessage>
    );
  }

  function renderInsightIcon(icon: DashboardInsight["icon"]) {
    if (icon === "wallet") {
      return <WalletIcon className="h-5 w-5" />;
    }

    if (icon === "users") {
      return <UsersIcon className="h-5 w-5" />;
    }

    if (icon === "calendar") {
      return <CalendarIcon className="h-5 w-5" />;
    }

    return <ReceiptIcon className="h-5 w-5" />;
  }

  function renderActivityIcon(icon: DashboardActivityFeedItem["icon"]) {
    if (icon === "payment") {
      return <WalletIcon className="h-5 w-5" />;
    }

    if (icon === "group") {
      return <UsersIcon className="h-5 w-5" />;
    }

    if (icon === "settlement") {
      return <ArrowsIcon className="h-5 w-5" />;
    }

    return <ReceiptIcon className="h-5 w-5" />;
  }

  function renderRecentActivity(items: DashboardActivityFeedItem[]) {
    return (
      <div className="space-y-3">
        <div className="space-y-3 md:hidden">
          {items.map((item) => {
            const [primaryDescription, secondaryDescription] = item.description.split(" · ");
            return (
              <article key={item.id} className="dashboard-activity-item flex-col items-start gap-3 px-4 py-4">
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="dashboard-activity-icon shrink-0">{renderActivityIcon(item.icon)}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{item.title}</div>
                      <div className="mt-1 text-xs text-muted">{item.meta}</div>
                    </div>
                  </div>
                  {item.badge ? <DashboardSignalPill label={item.badge.label} tone={item.badge.tone} /> : null}
                </div>
                <div className="w-full rounded-[14px] border border-slate-200/80 bg-white/88 px-3 py-2 text-sm text-ink">
                  {primaryDescription}
                </div>
                <div className="w-full text-sm text-muted">{secondaryDescription ?? "—"}</div>
              </article>
            );
          })}
        </div>

        <div className="dashboard-activity-table hidden overflow-x-auto md:block">
          <div className="min-w-[740px]">
            <div className="dashboard-activity-table-header">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Action</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Title</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Description</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Category</div>
              <div className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Date</div>
            </div>
            <ul>
              {items.map((item) => {
                const [primaryDescription, secondaryDescription] = item.description.split(" · ");
                return (
                  <li key={item.id}>
                    <div className="dashboard-activity-table-row">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="dashboard-activity-icon shrink-0">{renderActivityIcon(item.icon)}</span>
                        <span className="truncate text-sm font-semibold text-ink">{item.title}</span>
                      </div>
                      <div className="truncate text-sm text-ink">{primaryDescription}</div>
                      <div className="truncate text-sm text-muted">{secondaryDescription ?? "—"}</div>
                      <div>
                        {item.badge ? <DashboardSignalPill label={item.badge.label} tone={item.badge.tone} /> : null}
                      </div>
                      <div className="text-right text-[11px] text-muted">{item.meta}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 xl:space-y-8">
      <section className="dashboard-hero-panel overflow-hidden p-6 md:p-7 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#918970]">
              {t("dashboard.overviewEyebrow")}
            </div>
          </div>

          <div
            className="animated-pill-switch animated-pill-switch-compact"
            style={{ ["--animated-pill-count" as string]: 2, ["--animated-pill-index" as string]: period === "month" ? 0 : 1 }}
          >
            <span className="animated-pill-thumb" aria-hidden="true" />
            <button
              className={`animated-pill-option${period === "month" ? " animated-pill-option-active" : ""}`}
              onClick={() => setPeriod("month")}
              type="button"
            >
              {t("dashboard.rangeMonth")}
            </button>
            <button
              className={`animated-pill-option${period === "year" ? " animated-pill-option-active" : ""}`}
              onClick={() => setPeriod("year")}
              type="button"
            >
              {t("dashboard.rangeYear")}
            </button>
          </div>
        </div>

        {groupsQuery.isPending ? (
          renderFinancialCardsSkeleton()
        ) : groupsQuery.isError ? (
          renderDashboardError(groupsQuery.error)
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DashboardFinancialCard
              label={t("dashboard.netBalance")}
              value={isSettlementLoading ? "..." : canShowPersonalFinancials ? formatSignedCurrency(totalNetBalance) : "—"}
              icon={<WalletIcon className="h-5 w-5" />}
              tone={canShowPersonalFinancials ? (totalNetBalance > 0 ? "positive" : totalNetBalance < 0 ? "negative" : "neutral") : "neutral"}
              disabled={!canShowPersonalFinancials}
            />
            <DashboardFinancialCard
              label={t("dashboard.youOwe")}
              value={isSettlementLoading ? "..." : canShowPersonalFinancials ? formatCurrency(totalOutstandingOwe) : "—"}
              icon={<ArrowsIcon className="h-5 w-5" />}
              tone={canShowPersonalFinancials && totalOutstandingOwe > 0 ? "negative" : "neutral"}
              disabled={!canShowPersonalFinancials}
            />
            <DashboardFinancialCard
              label={t("dashboard.youAreOwed")}
              value={isSettlementLoading ? "..." : canShowPersonalFinancials ? formatCurrency(totalOutstandingOwed) : "—"}
              icon={<ReceiptIcon className="h-5 w-5" />}
              tone={canShowPersonalFinancials && totalOutstandingOwed > 0 ? "positive" : "neutral"}
              disabled={!canShowPersonalFinancials}
            />
            <DashboardFinancialCard
              label={t("dashboard.unsettledGroups")}
              value={String(unsettledGroupsCount)}
              icon={<UsersIcon className="h-5 w-5" />}
              tone={unsettledGroupsCount > 0 ? "brand" : "neutral"}
            />
          </div>
        )}

        {groupsQuery.isPending || isBillsLoading ? (
          renderInsightsSkeleton()
        ) : groupsQuery.isError ? (
          renderDashboardError(groupsQuery.error)
        ) : billQueryError ? (
          renderDashboardError(billQueryError)
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mt-5">
            {dashboardInsights.map((item) => (
              <DashboardInsightCard
                key={item.id}
                label={item.label}
                value={item.value}
                detail=''
                icon={renderInsightIcon(item.icon)}
              />
            ))}
          </div>
        )}

      </section>

      <DashboardSection
        eyebrow={t("dashboard.activityEyebrow")}
        title={t("dashboard.activityTitle")!}
      >
        {groupsQuery.isPending ? (
          <LoadingState lines={3} />
        ) : groupsQuery.isError ? (
          renderDashboardError(groupsQuery.error)
        ) : isBillsLoading || isSettlementLoading ? (
          stableRecentActivityState.items.length === 0 ? (
            <p className="text-sm text-muted">{t("dashboard.activityEmptyTitle")}</p>
          ) : (
            renderRecentActivity(stableRecentActivityState.items)
          )
        ) : billQueryError ? (
          renderDashboardError(billQueryError)
        ) : recentActivityFeed.length === 0 ? (
          <p className="text-sm text-muted">{t("dashboard.activityEmptyTitle")}</p>
        ) : (
          renderRecentActivity(recentActivityFeed)
        )}
      </DashboardSection>
    </div>
  );
}

export { DashboardPage as HomePage };
