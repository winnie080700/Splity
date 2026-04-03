import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type BillSummaryDto, type GroupSummaryDto } from "@api-client";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EditNameDialog } from "@/shared/ui/EditNameDialog";
import { GroupStatusBadge, formatGroupCreatedAt } from "@/shared/groups/groupMeta";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ArrowsIcon, ReceiptIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { CustomSelect } from "@/shared/ui/CustomSelect";
import { EmptyState, InlineMessage, LoadingState } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/utils/format";

type DashboardRange = "month" | "year";

type DashboardBillItem = {
  group: GroupSummaryDto;
  bill: BillSummaryDto;
};

type DashboardStep = {
  index: string;
  title: string;
  body: string;
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

function getContinuePath(group: GroupSummaryDto) {
  return `/groups/${group.id}/overview`;
}

function buildBillsPath(groupId: string) {
  return `/groups/${groupId}/bills#create-bill`;
}

function buildParticipantsPath(groupId: string) {
  return `/groups/${groupId}/participants`;
}

function buildSettlementsPath(groupId: string) {
  return `/groups/${groupId}/settlements`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const [period, setPeriod] = useState<DashboardRange>("month");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiClient.listGroups()
  });

  const groups = groupsQuery.data ?? [];
  const latestGroup = groups[0] ?? null;
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

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => apiClient.createGroup(name),
    onSuccess: async (group) => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      setCreateGroupError(null);
      setIsCreateGroupOpen(false);
      showToast({
        title: t("groups.createTitle"),
        description: t("feedback.created"),
        tone: "success"
      });
      navigate(`/groups/${group.id}/overview`);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      setCreateGroupError(message);
      showToast({
        title: t("feedback.requestFailed"),
        description: message,
        tone: "error"
      });
    }
  });

  const billGroups = groups.map((group, index) => ({
    group,
    bills: billQueries[index]?.data ?? []
  }));

  const isBillsLoading = groups.length > 0 && billQueries.some((query) => query.isPending);
  const billQueryError = billQueries.find((query) => query.isError)?.error ?? null;

  const overviewGroups = useMemo(() => {
    const includedGroupIds = new Set<string>();

    groups.forEach((group) => {
      if (isDateInRange(group.createdAtUtc, range.start, range.end)) {
        includedGroupIds.add(group.id);
      }
    });

    billGroups.forEach(({ group, bills }) => {
      if (bills.length > 0) {
        includedGroupIds.add(group.id);
      }
    });

    return groups.filter((group) => includedGroupIds.has(group.id));
  }, [billGroups, groups, range.end, range.start]);

  const currentGroupCount = overviewGroups.filter((group) => group.status !== "settled").length;
  const settledGroupCount = overviewGroups.filter((group) => group.status === "settled").length;
  const createdBillCount = billGroups.reduce((sum, item) => sum + item.bills.length, 0);

  const recentBills = useMemo<DashboardBillItem[]>(() => {
    return billGroups
      .flatMap(({ group, bills }) => bills.map((bill) => ({ group, bill })))
      .sort(
        (left, right) =>
          new Date(right.bill.transactionDateUtc).getTime() - new Date(left.bill.transactionDateUtc).getTime()
      )
      .slice(0, 4);
  }, [billGroups]);

  const flowSteps: DashboardStep[] = [
    {
      index: "01",
      title: t("dashboard.stepCreateGroupTitle"),
      body: t("dashboard.stepCreateGroupBody")
    },
    {
      index: "02",
      title: t("dashboard.stepAddParticipantsTitle"),
      body: t("dashboard.stepAddParticipantsBody")
    },
    {
      index: "03",
      title: t("dashboard.stepAddBillsTitle"),
      body: t("dashboard.stepAddBillsBody")
    },
    {
      index: "04",
      title: t("dashboard.stepOpenSettlementTitle"),
      body: t("dashboard.stepOpenSettlementBody")
    },
    {
      index: "05",
      title: t("dashboard.stepWaitPaymentsTitle"),
      body: t("dashboard.stepWaitPaymentsBody")
    }
  ];

  function handleRetryDashboardData() {
    void groupsQuery.refetch();
    void queryClient.invalidateQueries({ queryKey: ["dashboard", "bills"] });
  }

  return (
    <div className="space-y-6">
      <section className="dashboard-surface p-6 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#918970]">
              {t("dashboard.overviewEyebrow")}
            </div>
            <h2 className="mt-4 text-[1.8rem] font-semibold tracking-[-0.03em] text-[#1c1a16] sm:text-[2.3rem]">
              {t("dashboard.overviewTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#7f7869]">{t("dashboard.overviewBody")}</p>
          </div>

          <div className="w-full lg:max-w-[220px]">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#918970]">
              {t("dashboard.rangeLabel")}
            </div>
            <CustomSelect
              ariaLabel={t("dashboard.rangeLabel")}
              options={[
                { value: "month", label: t("dashboard.rangeMonth") },
                { value: "year", label: t("dashboard.rangeYear") }
              ]}
              value={period}
              onChange={(value) => setPeriod(value as DashboardRange)}
            />
          </div>
        </div>

        {groupsQuery.isPending || isBillsLoading ? (
          <div className="mt-6">
            <LoadingState lines={2} />
          </div>
        ) : groupsQuery.isError || billQueryError ? (
          <div className="mt-6">
            <InlineMessage
              tone="error"
              title={t("feedback.loadFailed")}
              action={(
                <button className="workspace-shell-trigger" onClick={handleRetryDashboardData} type="button">
                  {t("common.retry")}
                </button>
              )}
            >
              {getErrorMessage(groupsQuery.error ?? billQueryError)}
            </InlineMessage>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              <article className="dashboard-metric-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f8873]">
                      {t("dashboard.currentGroups")}
                    </div>
                    <div className="mt-4 text-[2.6rem] font-semibold tracking-[-0.05em] text-[#1a1813]">
                      {String(currentGroupCount).padStart(2, "0")}
                    </div>
                  </div>
                  <span className="dashboard-metric-icon bg-[#f1ecd8] text-[#5f7520]">
                    <WalletIcon className="h-5 w-5" />
                  </span>
                </div>
              </article>

              <article className="dashboard-metric-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f8873]">
                      {t("dashboard.settledGroups")}
                    </div>
                    <div className="mt-4 text-[2.6rem] font-semibold tracking-[-0.05em] text-[#1a1813]">
                      {String(settledGroupCount).padStart(2, "0")}
                    </div>
                  </div>
                  <span className="dashboard-metric-icon bg-[#eef5e3] text-[#5f7520]">
                    <ArrowsIcon className="h-5 w-5" />
                  </span>
                </div>
              </article>

              <article className="dashboard-metric-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8f8873]">
                      {t("dashboard.createdBills")}
                    </div>
                    <div className="mt-4 text-[2.6rem] font-semibold tracking-[-0.05em] text-[#1a1813]">
                      {String(createdBillCount).padStart(2, "0")}
                    </div>
                  </div>
                  <span className="dashboard-metric-icon bg-[#f7efe5] text-[#5f7520]">
                    <ReceiptIcon className="h-5 w-5" />
                  </span>
                </div>
              </article>
            </div>

            <div className="mt-4 rounded-[24px] border border-[#e5ddcb] bg-[#fbf8f1] px-4 py-4 text-sm leading-7 text-[#7c7567]">
              {t("dashboard.periodHint")}
            </div>

            {overviewGroups.length === 0 && createdBillCount === 0 ? (
              <div className="mt-4">
                <InlineMessage tone="info">{t("dashboard.overviewEmpty")}</InlineMessage>
              </div>
            ) : null}
          </>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <section className="dashboard-surface p-6">
          <div className="max-w-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#918970]">
              {t("dashboard.recentGroupsEyebrow")}
            </div>
            <h2 className="mt-4 text-[1.8rem] font-semibold tracking-[-0.03em] text-[#1c1a16]">
              {t("dashboard.recentGroupsTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#7f7869]">{t("dashboard.recentGroupsBody")}</p>
          </div>

          <div className="mt-6">
            {groupsQuery.isPending ? (
              <LoadingState lines={3} />
            ) : groupsQuery.isError ? (
              <InlineMessage
                tone="error"
                title={t("feedback.loadFailed")}
                action={(
                  <button className="workspace-shell-trigger" onClick={handleRetryDashboardData} type="button">
                    {t("common.retry")}
                  </button>
                )}
              >
                {getErrorMessage(groupsQuery.error)}
              </InlineMessage>
            ) : groups.length === 0 ? (
              <EmptyState
                icon={<WalletIcon className="h-6 w-6" />}
                title={t("home.emptyTitle")}
                description={t("home.emptyBody")}
                action={(
                  <button
                    className="landing-contact-button min-w-0"
                    onClick={() => {
                      setCreateGroupError(null);
                      setIsCreateGroupOpen(true);
                    }}
                    type="button"
                  >
                    {t("dashboard.createGroupAction")}
                  </button>
                )}
              />
            ) : (
              <div className="space-y-3">
                {groups.slice(0, 4).map((group) => (
                  <article key={group.id} className="dashboard-list-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold tracking-tight text-[#1a1813]">{group.name}</div>
                        <p className="mt-1 text-sm text-[#7c7567]">
                          {formatGroupCreatedAt(group.createdAtUtc, language)}
                        </p>
                      </div>
                      <GroupStatusBadge status={group.status} t={t} className="shrink-0" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link className="workspace-shell-trigger" to={getContinuePath(group)}>
                        {t("sidebar.openGroup")}
                      </Link>
                      <Link className="workspace-shell-trigger" to={buildBillsPath(group.id)}>
                        {t("common.goToBills")}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-surface p-6">
          <div className="max-w-2xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#918970]">
              {t("dashboard.recentBillsEyebrow")}
            </div>
            <h2 className="mt-4 text-[1.8rem] font-semibold tracking-[-0.03em] text-[#1c1a16]">
              {t("dashboard.recentBillsTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#7f7869]">{t("dashboard.recentBillsBody")}</p>
          </div>

          <div className="mt-6">
            {groupsQuery.isPending ? (
              <LoadingState lines={3} />
            ) : groupsQuery.isError ? (
              <InlineMessage
                tone="error"
                title={t("feedback.loadFailed")}
                action={(
                  <button className="workspace-shell-trigger" onClick={handleRetryDashboardData} type="button">
                    {t("common.retry")}
                  </button>
                )}
              >
                {getErrorMessage(groupsQuery.error)}
              </InlineMessage>
            ) : isBillsLoading ? (
              <LoadingState lines={3} />
            ) : billQueryError ? (
              <InlineMessage
                tone="error"
                title={t("feedback.loadFailed")}
                action={(
                  <button className="workspace-shell-trigger" onClick={handleRetryDashboardData} type="button">
                    {t("common.retry")}
                  </button>
                )}
              >
                {getErrorMessage(billQueryError)}
              </InlineMessage>
            ) : recentBills.length === 0 ? (
              <EmptyState
                icon={<ReceiptIcon className="h-6 w-6" />}
                title={t("bills.empty")}
                description={t("dashboard.recentBillsEmpty")}
                action={
                  latestGroup ? (
                    <Link className="workspace-shell-trigger" to={buildBillsPath(latestGroup.id)}>
                      {t("common.goToBills")}
                    </Link>
                  ) : (
                    <button
                      className="landing-contact-button min-w-0"
                      onClick={() => {
                        setCreateGroupError(null);
                        setIsCreateGroupOpen(true);
                      }}
                      type="button"
                    >
                      {t("dashboard.createGroupAction")}
                    </button>
                  )
                }
              />
            ) : (
              <div className="space-y-3">
                {recentBills.map(({ group, bill }) => (
                  <article key={`${group.id}:${bill.id}`} className="dashboard-list-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold tracking-tight text-[#1a1813]">{bill.storeName}</div>
                        <p className="mt-1 text-sm text-[#7c7567]">{group.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#7c7567]">{formatGroupCreatedAt(bill.transactionDateUtc, language)}</div>
                        <div className="mt-1 text-lg font-semibold tracking-tight text-[#1a1813]">
                          RM {bill.grandTotalAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link className="workspace-shell-trigger" to={buildBillsPath(group.id)}>
                        {t("common.goToBills")}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <EditNameDialog
        open={isCreateGroupOpen}
        title={t("groups.createTitle")}
        description={t("groups.createBody")}
        initialValue=""
        placeholder={t("home.groupPlaceholder")}
        cancelLabel={t("common.cancel")}
        submitLabel={t("groups.createAction")}
        validationMessage={t("groups.nameRequired")}
        error={createGroupError}
        isBusy={createGroupMutation.isPending}
        onClose={() => {
          setCreateGroupError(null);
          setIsCreateGroupOpen(false);
        }}
        onSubmit={(value) => createGroupMutation.mutate(value)}
      />
    </div>
  );
}

export { DashboardPage as HomePage };
