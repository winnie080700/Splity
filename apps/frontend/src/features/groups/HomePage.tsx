import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type BillSummaryDto, type GroupSummaryDto } from "@api-client";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EditNameDialog } from "@/shared/ui/EditNameDialog";
import { GroupStatusBadge, formatGroupCreatedAt } from "@/shared/groups/groupMeta";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ArrowsIcon, ReceiptIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { EmptyState, InlineMessage, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/toast";
import { getErrorMessage } from "@/shared/utils/format";

type DashboardRange = "month" | "year";

type DashboardBillItem = {
  group: GroupSummaryDto;
  bill: BillSummaryDto;
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

  function handleRetryDashboardData() {
    void groupsQuery.refetch();
    void queryClient.invalidateQueries({ queryKey: ["dashboard", "bills"] });
  }

  return (
    <div className="space-y-6">

      <SectionCard className="p-6 md:p-7">
        <PageHeading
          eyebrow={t("dashboard.overviewEyebrow")}
          title={t("dashboard.overviewTitle")}
          description={t("dashboard.overviewBody")}
          actions={(
            <div className="w-full sm:w-auto">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {t("dashboard.rangeLabel")}
              </div>
              <select
                className="select-base"
                value={period}
                onChange={(event) => setPeriod(event.target.value as DashboardRange)}
              >
                <option value="month">{t("dashboard.rangeMonth")}</option>
                <option value="year">{t("dashboard.rangeYear")}</option>
              </select>
            </div>
          )}
        />

        {groupsQuery.isPending ? (
          <div className="mt-6">
            <LoadingState lines={1} />
          </div>
        ) : groupsQuery.isError ? (
          <div className="mt-6">
            <InlineMessage
              tone="error"
              title={t("feedback.loadFailed")}
              action={(
                <button className="button-secondary" onClick={handleRetryDashboardData} type="button">
                  {t("common.retry")}
                </button>
              )}
            >
              {getErrorMessage(groupsQuery.error)}
            </InlineMessage>
          </div>
        ) : isBillsLoading ? (
          <div className="mt-6">
            <LoadingState lines={1} />
          </div>
        ) : billQueryError ? (
          <div className="mt-6">
            <InlineMessage
              tone="error"
              title={t("feedback.loadFailed")}
              action={(
                <button className="button-secondary" onClick={handleRetryDashboardData} type="button">
                  {t("common.retry")}
                </button>
              )}
            >
              {getErrorMessage(billQueryError)}
            </InlineMessage>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <StatTile
                label={t("dashboard.currentGroups")}
                value={String(currentGroupCount).padStart(2, "0")}
                icon={<WalletIcon className="h-5 w-5" />}
                tone="warning"
              />
              <StatTile
                label={t("dashboard.settledGroups")}
                value={String(settledGroupCount).padStart(2, "0")}
                icon={<ArrowsIcon className="h-5 w-5" />}
                tone="success"
              />
              <StatTile
                label={t("dashboard.createdBills")}
                value={String(createdBillCount).padStart(2, "0")}
                icon={<ReceiptIcon className="h-5 w-5" />}
                tone="brand"
              />
            </div>

            <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-muted">
              {t("dashboard.periodHint")}
            </div>

            {overviewGroups.length === 0 && createdBillCount === 0 ? (
              <div className="mt-4">
                <InlineMessage tone="info">{t("dashboard.overviewEmpty")}</InlineMessage>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <SectionCard className="p-6">
          <PageHeading
            eyebrow={t("dashboard.recentGroupsEyebrow")}
            title={t("dashboard.recentGroupsTitle")}
            description={t("dashboard.recentGroupsBody")}
          />

          <div className="mt-5">
            {groupsQuery.isPending ? (
              <LoadingState lines={3} />
            ) : groupsQuery.isError ? (
              <InlineMessage
                tone="error"
                title={t("feedback.loadFailed")}
                action={(
                  <button className="button-secondary" onClick={handleRetryDashboardData} type="button">
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
                    className="button-primary"
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
                  <article key={group.id} className="list-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold tracking-tight text-ink">{group.name}</div>
                        <p className="mt-1 text-sm text-muted">
                          {formatGroupCreatedAt(group.createdAtUtc, language)}
                        </p>
                      </div>
                      <GroupStatusBadge status={group.status} t={t} className="shrink-0" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link className="button-secondary" to={getContinuePath(group)}>
                        {t("sidebar.openGroup")}
                      </Link>
                      <Link className="button-secondary" to={buildBillsPath(group.id)}>
                        {t("common.goToBills")}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard className="p-6">
          <PageHeading
            eyebrow={t("dashboard.recentBillsEyebrow")}
            title={t("dashboard.recentBillsTitle")}
            description={t("dashboard.recentBillsBody")}
          />

          <div className="mt-5">
            {groupsQuery.isPending ? (
              <LoadingState lines={3} />
            ) : groupsQuery.isError ? (
              <InlineMessage
                tone="error"
                title={t("feedback.loadFailed")}
                action={(
                  <button className="button-secondary" onClick={handleRetryDashboardData} type="button">
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
                  <button className="button-secondary" onClick={handleRetryDashboardData} type="button">
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
                    <Link className="button-secondary" to={buildBillsPath(latestGroup.id)}>
                      {t("common.goToBills")}
                    </Link>
                  ) : (
                    <button
                      className="button-primary"
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
                  <article key={`${group.id}:${bill.id}`} className="list-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold tracking-tight text-ink">{bill.storeName}</div>
                        <p className="mt-1 text-sm text-muted">{group.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted">{formatGroupCreatedAt(bill.transactionDateUtc, language)}</div>
                        <div className="mt-1 text-lg font-semibold tracking-tight text-ink">
                          RM {bill.grandTotalAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link className="button-secondary" to={buildBillsPath(group.id)}>
                        {t("common.goToBills")}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
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
