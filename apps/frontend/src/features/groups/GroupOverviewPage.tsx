import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { SettlementShareDialog } from "@/features/settlements/SettlementShareDialog";
import { isSettlementPaid, isSettlementReceived, isSettlementUnpaid } from "@/features/settlements/status";
import { GroupStatusBadge, formatGroupCreatedAt, isGroupLocked } from "@/shared/groups/groupMeta";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EmptyState, InlineMessage, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { ArrowsIcon, CalendarIcon, ReceiptIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";

export function GroupOverviewPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isStartSettlementOpen, setIsStartSettlementOpen] = useState(false);
  const [isMarkSettledOpen, setIsMarkSettledOpen] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  const groupQuery = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => apiClient.getGroup(groupId!),
    enabled: Boolean(groupId)
  });

  const participantsQuery = useQuery({
    queryKey: ["participants", groupId],
    queryFn: () => apiClient.listParticipants(groupId!),
    enabled: Boolean(groupId)
  });

  const billsQuery = useQuery({
    queryKey: ["bills", groupId],
    queryFn: () => apiClient.listBills(groupId!),
    enabled: Boolean(groupId)
  });

  const settlementQuery = useQuery({
    queryKey: ["settlements", groupId],
    queryFn: () => apiClient.getSettlements(groupId!),
    enabled: Boolean(groupId)
  });

  const group = groupQuery.data;
  const bills = billsQuery.data ?? [];
  const transfers = settlementQuery.data?.transfers ?? [];
  const isLocked = group ? isGroupLocked(group.status) : false;
  const billsCount = bills.length;
  const participantsCount = participantsQuery.data?.length ?? 0;
  const transfersCount = transfers.length;
  const totalAmount = bills.reduce((sum, bill) => sum + bill.grandTotalAmount, 0);
  const latestBill = bills
    .slice()
    .sort((left, right) => new Date(right.transactionDateUtc).getTime() - new Date(left.transactionDateUtc).getTime())[0];
  const unpaidTransfersCount = transfers.filter((transfer) => isSettlementUnpaid(transfer.status)).length;
  const awaitingReviewCount = transfers.filter((transfer) => isSettlementPaid(transfer.status)).length;
  const completedTransfersCount = transfers.filter((transfer) => isSettlementReceived(transfer.status)).length;

  const updateStatusMutation = useMutation({
    mutationFn: async (status: "settling" | "settled") => apiClient.updateGroupStatus(groupId!, { status }),
    onSuccess: async (nextGroup, nextStatus) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["group", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["groups"] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      setStatusActionError(null);
      setIsStartSettlementOpen(false);
      setIsMarkSettledOpen(false);
      showToast({
        title: nextStatus === "settling" ? t("groups.startSettlementAction") : t("groups.markSettledAction"),
        description: t("feedback.saved"),
        tone: "success"
      });

      if (nextGroup.status === "settling") {
        setIsShareDialogOpen(true);
      }
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setStatusActionError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  if (groupQuery.isError) {
    return (
      <InlineMessage
        tone="error"
        title={t("feedback.loadFailed")}
        action={(
          <button className="button-secondary" onClick={() => groupQuery.refetch()} type="button">
            {t("common.retry")}
          </button>
        )}
      >
        {getErrorMessage(groupQuery.error)}
      </InlineMessage>
    );
  }

  if (groupQuery.isPending || participantsQuery.isPending || billsQuery.isPending || settlementQuery.isPending) {
    return <LoadingState lines={4} />;
  }

  if (!group) {
    return (
      <EmptyState
        icon={<WalletIcon className="h-6 w-6" />}
        title={t("feedback.loadFailed")}
        description={t("groups.overviewMissing")}
      />
    );
  }

  const statusBodyKey = {
    unresolved: "groups.statusUnresolvedBody",
    settling: "groups.statusSettlingBody",
    settled: "groups.statusSettledBody"
  }[group.status] as
    | "groups.statusUnresolvedBody"
    | "groups.statusSettlingBody"
    | "groups.statusSettledBody";

  return (
    <div className="space-y-6">
      <SectionCard className="p-6 md:p-7">
        <PageHeading
          eyebrow={t("groups.overviewEyebrow")}
          title={t("groups.overviewTitle")}
          description={t("groups.overviewBody")}
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr,0.96fr]">
          <article className="rounded-[28px] border border-brand/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(255,255,255,0.98))] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <GroupStatusBadge status={group.status} t={t} />
              <span className="text-sm text-muted">{formatGroupCreatedAt(group.createdAtUtc, language)}</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{group.name}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{t(statusBodyKey)}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <OverviewFactCard
                icon={<CalendarIcon className="h-5 w-5" />}
                label={t("groups.createdOnLabel")}
                value={formatGroupCreatedAt(group.createdAtUtc, language)}
              />
              <OverviewFactCard
                icon={<ReceiptIcon className="h-5 w-5" />}
                label={t("groups.latestBillLabel")}
                value={latestBill ? formatDate(latestBill.transactionDateUtc) : t("groups.latestBillEmpty")}
              />
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-soft">
            <div className="text-sm font-semibold text-ink">{t("groups.stageActionsTitle")}</div>
            <p className="mt-2 text-sm leading-6 text-muted">{t("groups.stageActionsBody")}</p>

            <div className="mt-5 space-y-3">
              {group.status === "unresolved" ? (
                <>
                  <button
                    className="button-primary w-full justify-center"
                    disabled={updateStatusMutation.isPending || billsCount === 0}
                    onClick={() => {
                      setStatusActionError(null);
                      setIsStartSettlementOpen(true);
                    }}
                    type="button"
                  >
                    {t("groups.startSettlementAction")}
                  </button>
                  <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-muted">
                    {billsCount === 0 ? t("groups.startSettlementHintDisabled") : t("groups.startSettlementHint")}
                  </div>
                </>
              ) : group.status === "settling" ? (
                <>
                  <button
                    className="button-secondary w-full justify-center"
                    disabled={updateStatusMutation.isPending}
                    onClick={() => setIsShareDialogOpen(true)}
                    type="button"
                  >
                    {t("groups.shareLinkAction")}
                  </button>
                  <button
                    className="button-primary w-full justify-center"
                    disabled={updateStatusMutation.isPending}
                    onClick={() => {
                      setStatusActionError(null);
                      setIsMarkSettledOpen(true);
                    }}
                    type="button"
                  >
                    {t("groups.markSettledAction")}
                  </button>
                </>
              ) : (
                <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-muted">
                  {t("groups.settledOverviewHint")}
                </div>
              )}

              {isLocked ? <InlineMessage tone="info">{t("groups.readOnlyHint")}</InlineMessage> : null}
            </div>
          </article>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={t("participants.countLabel")}
            value={String(participantsCount).padStart(2, "0")}
            icon={<UsersIcon className="h-5 w-5" />}
          />
          <StatTile
            label={t("dashboard.createdBills")}
            value={String(billsCount).padStart(2, "0")}
            icon={<ReceiptIcon className="h-5 w-5" />}
            tone="brand"
          />
          <StatTile
            label={t("groups.totalAmountLabel")}
            value={formatCurrency(totalAmount)}
            icon={<WalletIcon className="h-5 w-5" />}
            tone="warning"
          />
          <StatTile
            label={t("settlement.transfersCount")}
            value={String(transfersCount).padStart(2, "0")}
            icon={<ArrowsIcon className="h-5 w-5" />}
            tone="success"
          />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.08fr,0.92fr]">
          <article className="rounded-[26px] border border-slate-200/80 bg-white/94 p-5 shadow-soft">
            <div>
              <h2 className="section-title">{t("groups.settlementSnapshotTitle")}</h2>
              <p className="mt-2 section-copy">{t("groups.settlementSnapshotBody")}</p>
            </div>

            {transfersCount === 0 ? (
              <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-muted">
                {t("groups.settlementSnapshotEmpty")}
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <StatTile
                  label={t("groups.unpaidTransfersLabel")}
                  value={String(unpaidTransfersCount).padStart(2, "0")}
                  icon={<WalletIcon className="h-5 w-5" />}
                  tone="warning"
                />
                <StatTile
                  label={t("groups.awaitingReviewLabel")}
                  value={String(awaitingReviewCount).padStart(2, "0")}
                  icon={<ArrowsIcon className="h-5 w-5" />}
                  tone="brand"
                />
                <StatTile
                  label={t("groups.completedTransfersLabel")}
                  value={String(completedTransfersCount).padStart(2, "0")}
                  icon={<UsersIcon className="h-5 w-5" />}
                  tone="success"
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="button-secondary" to={`/groups/${group.id}/participants`}>
                {t("nav.participants")}
              </Link>
              <Link className="button-secondary" to={`/groups/${group.id}/bills`}>
                {t("nav.bills")}
              </Link>
              <Link className="button-secondary" to={`/groups/${group.id}/settlements`}>
                {t("nav.settlement")}
              </Link>
            </div>
          </article>

          <article className="rounded-[26px] border border-slate-200/80 bg-white/94 p-5 shadow-soft">
            <div>
              <h2 className="section-title">{t("groups.groupFactsTitle")}</h2>
              <p className="mt-2 section-copy">{t("groups.groupFactsBody")}</p>
            </div>

            <div className="mt-5 space-y-3">
              <OverviewDataRow
                label={t("groups.currentStatusLabel")}
                value={<GroupStatusBadge status={group.status} t={t} />}
              />
              <OverviewDataRow
                label={t("groups.createdOnLabel")}
                value={formatGroupCreatedAt(group.createdAtUtc, language)}
              />
              <OverviewDataRow
                label={t("groups.latestBillLabel")}
                value={latestBill ? formatDate(latestBill.transactionDateUtc) : t("groups.latestBillEmpty")}
              />
              <OverviewDataRow
                label={t("groups.editabilityLabel")}
                value={isLocked ? t("groups.lockedNow") : t("groups.editableNow")}
              />
            </div>

            {isLocked ? (
              <div className="mt-5">
                <InlineMessage tone="info">{t("groups.readOnlyHint")}</InlineMessage>
              </div>
            ) : null}
          </article>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={isStartSettlementOpen}
        title={t("groups.startSettlementTitle")}
        description={t("groups.startSettlementBody")}
        details={group.name}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("groups.startSettlementAction")}
        error={statusActionError}
        isBusy={updateStatusMutation.isPending}
        onClose={() => {
          setStatusActionError(null);
          setIsStartSettlementOpen(false);
        }}
        onConfirm={() => updateStatusMutation.mutate("settling")}
      />

      <ConfirmDialog
        open={isMarkSettledOpen}
        title={t("groups.markSettledTitle")}
        description={t("groups.markSettledBody")}
        details={group.name}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("groups.markSettledAction")}
        error={statusActionError}
        isBusy={updateStatusMutation.isPending}
        onClose={() => {
          setStatusActionError(null);
          setIsMarkSettledOpen(false);
        }}
        onConfirm={() => updateStatusMutation.mutate("settled")}
      />

      <SettlementShareDialog
        open={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        groupId={group.id}
        groupName={group.name}
        creatorName={group.createdByUserName ?? undefined}
        fromDate=""
        toDate=""
        hasInvalidDateRange={false}
      />
    </div>
  );
}

function OverviewFactCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/70 bg-white/78 px-4 py-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-brand">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</div>
          <div className="mt-2 text-sm font-medium text-ink">{value}</div>
        </div>
      </div>
    </div>
  );
}

function OverviewDataRow({
  label,
  value
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-slate-200/80 bg-slate-50/75 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className="text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
