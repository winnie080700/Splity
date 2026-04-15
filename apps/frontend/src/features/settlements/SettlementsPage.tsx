import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type SettlementTransferDto } from "@api-client";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { downloadSettlementSummaryImage } from "@/features/settlements/summaryImage";
import { GroupStatusBadge, isGroupLocked } from "@/shared/groups/groupMeta";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { formatCurrency, getErrorMessage } from "@/shared/utils/format";
import { EmptyState, InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { ArrowsIcon, CalendarIcon, SparklesIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import { SettlementShareDialog } from "@/features/settlements/SettlementShareDialog";
import { isSettlementPaid, isSettlementReceived, isSettlementUnpaid, SETTLEMENT_STATUS } from "@/features/settlements/status";

export function SettlementsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { isGuest } = useAuth();
  const { showToast } = useToast();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actingParticipantId, setActingParticipantId] = useState("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isStartSettlementOpen, setIsStartSettlementOpen] = useState(false);
  const [isMarkSettledOpen, setIsMarkSettledOpen] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const hasInvalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);

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

  const settlementQuery = useQuery({
    queryKey: ["settlements", groupId, fromDate, toDate],
    queryFn: () => apiClient.getSettlements(groupId!, {
      fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDate: toDate ? new Date(toDate).toISOString() : undefined
    }),
    enabled: Boolean(groupId) && !hasInvalidDateRange
  });

  const currentShareQuery = useQuery({
    queryKey: ["current-settlement-share", groupId],
    queryFn: () => apiClient.getCurrentSettlementShare(groupId!),
    enabled: Boolean(groupId),
    retry: false
  });

  const balances = settlementQuery.data?.netBalances ?? [];
  const transfers = settlementQuery.data?.transfers ?? [];
  const isLocked = groupQuery.data ? isGroupLocked(groupQuery.data.status) : false;
  const canEditGroup = groupQuery.data?.canEdit ?? false;
  const isReadOnly = isLocked || !canEditGroup;
  const nameById = Object.fromEntries(balances.map((x) => [x.participantId, x.participantName]));
  const creditors = balances.filter((balance) => balance.netAmount > 0).length;
  const debtors = balances.filter((balance) => balance.netAmount < 0).length;

  useEffect(() => {
    if (!actingParticipantId && balances.length > 0) {
      setActingParticipantId(balances[0].participantId);
    }
  }, [actingParticipantId, balances]);

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

      if (nextGroup.status === "settling" && !isGuest) {
        setIsShareDialogOpen(true);
      }
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setStatusActionError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: (transfer: SettlementTransferDto) => apiClient.markSettlementPaid(groupId!, {
      fromParticipantId: transfer.fromParticipantId,
      toParticipantId: transfer.toParticipantId,
      amount: transfer.amount,
      fromDateUtc: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDateUtc: toDate ? new Date(toDate).toISOString() : undefined,
      actorParticipantId: actingParticipantId
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settlements", groupId] });
      showToast({ title: t("settlement.markPaid"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => showToast({ title: t("feedback.requestFailed"), description: getErrorMessage(error), tone: "error" })
  });

  const markReceivedMutation = useMutation({
    mutationFn: (transfer: SettlementTransferDto) => apiClient.markSettlementReceived(groupId!, {
      fromParticipantId: transfer.fromParticipantId,
      toParticipantId: transfer.toParticipantId,
      amount: transfer.amount,
      fromDateUtc: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDateUtc: toDate ? new Date(toDate).toISOString() : undefined,
      actorParticipantId: actingParticipantId
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settlements", groupId] });
      showToast({ title: t("settlement.markReceived"), description: t("feedback.saved"), tone: "success" });
    },
    onError: (error) => showToast({ title: t("feedback.requestFailed"), description: getErrorMessage(error), tone: "error" })
  });

  const isBusy = markPaidMutation.isPending || markReceivedMutation.isPending;
  const isUnresolved = groupQuery.data?.status === "unresolved";
  const canSaveGuestSummary = isGuest && groupQuery.data?.status === "settled" && !hasInvalidDateRange;

  async function handleSaveGuestSummary() {
    if (!groupQuery.data) {
      return;
    }

    try {
      await downloadSettlementSummaryImage({
        fileName: createSummaryImageFileName(),
        groupName: groupQuery.data.name,
        subtitle: t("guest.summaryImageSubtitle"),
        balances,
        transfers,
        receiverPaymentInfos: currentShareQuery.data?.receiverPaymentInfos ?? [],
        statusLabel: (status) => statusLabel(status, t),
        formatCurrency
      });
      showToast({ title: t("guest.summaryImageSavedTitle"), description: t("guest.summaryImageSavedBody"), tone: "success" });
    }
    catch (error) {
      showToast({ title: t("feedback.requestFailed"), description: error instanceof Error ? error.message : getErrorMessage(error), tone: "error" });
    }
  }

  if (isUnresolved) {
    return (
      <div className="space-y-6">
        <SectionCard className="p-6 md:p-7">
          <PageHeading
            eyebrow={t("nav.settlement")}
            title={t("settlement.unresolvedTitle")}
            description={t("settlement.unresolvedBody")}
          />
          {groupQuery.data ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <GroupStatusBadge status={groupQuery.data.status} t={t} />
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.04fr,0.96fr]">
            <article className="rounded-[26px] border border-brand/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(255,255,255,0.98))] p-5 shadow-soft">
              <h2 className="section-title">{t("settlement.unresolvedPromptTitle")}</h2>
              <p className="mt-2 section-copy">{t("settlement.unresolvedPromptBody")}</p>

              <div className="mt-5 space-y-3">
                {[
                  t("settlement.unresolvedPointStatus"),
                  t("settlement.unresolvedPointQuestion"),
                  t("settlement.unresolvedPointLock"),
                  t("settlement.unresolvedPointConfirm")
                ].map((point) => (
                  <div key={point} className="rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-3 text-sm leading-6 text-muted">
                    {point}
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[26px] border border-slate-200/80 bg-white/94 p-5 shadow-soft">
              <div>
                <h2 className="section-title">{t("settlement.unresolvedNextTitle")}</h2>
                <p className="mt-2 section-copy">{t("settlement.unresolvedNextBody")}</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatTile
                  label={t("groups.currentStatusLabel")}
                  value={t("groups.statusUnresolved")}
                  icon={<WalletIcon className="h-5 w-5" />}
                  tone="warning"
                />
                <StatTile
                  label={t("settlement.transfersCount")}
                  value="00"
                  icon={<ArrowsIcon className="h-5 w-5" />}
                  tone="brand"
                />
              </div>

              <div className="mt-5 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-muted">
                {t("settlement.unresolvedLockHint")}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="button-primary"
                  disabled={updateStatusMutation.isPending || isReadOnly}
                  onClick={() => {
                    setStatusActionError(null);
                    setIsStartSettlementOpen(true);
                  }}
                  type="button"
                >
                  {updateStatusMutation.isPending ? <LoadingSpinner /> : null}
                  {t("groups.startSettlementAction")}
                </button>
                {groupId ? (
                  <Link className="button-secondary" to={`/groups/${groupId}/bills`}>
                    {t("common.goToBills")}
                  </Link>
                ) : null}
              </div>
            </article>
          </div>
        </SectionCard>

        <ConfirmDialog
          open={isStartSettlementOpen}
          title={t("groups.startSettlementTitle")}
          description={t("groups.startSettlementBody")}
          details={groupQuery.data?.name ?? ""}
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

        {!isGuest && groupId && canEditGroup ? (
        <SettlementShareDialog
          open={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          groupId={groupId}
          groupName={groupQuery.data?.name}
          creatorName={groupQuery.data?.createdByUserName ?? undefined}
          fromDate={fromDate}
          toDate={toDate}
          hasInvalidDateRange={hasInvalidDateRange}
          groupStatus={groupQuery.data?.status}
          participants={participantsQuery.data ?? []}
        />
      ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard className="p-6">
        <PageHeading
          eyebrow={t("nav.settlement")}
          title={t("settlement.transferPlan")}
          description={t("settlement.subtitle") + t("settlement.shareHint")}
          actions={(
            <div className="flex flex-wrap gap-3">
              {!isGuest && groupId ? (
                <button className="button-secondary" disabled={!canEditGroup} onClick={() => setIsShareDialogOpen(true)} type="button">
                  {t("groups.shareLinkAction")}
                </button>
              ) : null}
              {canSaveGuestSummary ? (
                <button className="button-secondary" onClick={handleSaveGuestSummary} type="button">
                  {t("guest.saveSummaryImage")}
                </button>
              ) : null}
              {groupQuery.data?.status === "settling" ? (
                <button
                  className="button-primary"
                  disabled={updateStatusMutation.isPending || isReadOnly}
                  onClick={() => {
                    setStatusActionError(null);
                    setIsMarkSettledOpen(true);
                  }}
                  type="button"
                >
                  {updateStatusMutation.isPending ? <LoadingSpinner /> : null}
                  {t("groups.markSettledAction")}
                </button>
              ) : null}
            </div>
          )}
        />
        {groupQuery.data ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <GroupStatusBadge status={groupQuery.data.status} t={t} />
          </div>
        ) : null}
        {isReadOnly ? (
          <div className="mt-4">
            <InlineMessage tone="info">{canEditGroup ? t("groups.readOnlySettlement") : t("groups.readOnlyMemberHint")}</InlineMessage>
          </div>
        ) : null}
        {isGuest ? (
          <div className="mt-4">
            <InlineMessage tone="info">
              {groupQuery.data?.status === "settled" ? t("guest.summaryImageHint") : t("guest.shareDisabledHint")}
            </InlineMessage>
          </div>
        ) : null}
        <div className="mt-6 grid gap-3 xl:grid-cols-[1.36fr,0.78fr,0.78fr,0.78fr]">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink"><CalendarIcon className="h-4 w-4 text-brand" />{t("settlement.filters")}</div>
            <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.filtersHint")}</p>
            <div className="mt-4 grid gap-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input className={["input-base", hasInvalidDateRange ? "border-danger focus:border-danger focus:ring-danger/10" : ""].join(" ")} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <input className={["input-base", hasInvalidDateRange ? "border-danger focus:border-danger focus:ring-danger/10" : ""].join(" ")} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              {/* <div>
                <div className="text-sm font-semibold text-ink">{t("settlement.actingAs")}</div>
                <p className="mt-1 text-sm leading-6 text-muted">{t("settlement.actingAsHint")}</p>
                <select className="input-base mt-3" value={actingParticipantId} onChange={(e) => setActingParticipantId(e.target.value)}>
                  {balances.length === 0 ? <option value="">{t("settlement.selectParticipant")}</option> : null}
                  {balances.map((balance) => <option key={balance.participantId} value={balance.participantId}>{balance.participantName}</option>)}
                </select>
              </div> */}
            </div>
            {hasInvalidDateRange ? <p className="mt-3 text-sm font-medium text-danger">{t("settlement.dateRangeInvalid")}</p> : null}
          </div>
          <StatTile label={t("settlement.creditors")} value={String(creditors).padStart(2, "0")} icon={<WalletIcon className="h-5 w-5" />} tone="success" />
          <StatTile label={t("settlement.debtors")} value={String(debtors).padStart(2, "0")} icon={<UsersIcon className="h-5 w-5" />} tone="warning" />
          <StatTile label={t("settlement.transfersCount")} value={String(transfers.length).padStart(2, "0")} icon={<ArrowsIcon className="h-5 w-5" />} tone="brand" />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr] 2xl:grid-cols-[0.86fr,1.14fr]">
        <SectionCard id="net-balances" className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="section-title">{t("settlement.netBalances")}</h2><p className="mt-2 section-copy">{groupQuery.data?.name ? `${groupQuery.data.name} · ${t("settlement.subtitle")}` : t("settlement.subtitle")}</p></div><span className="tag bg-sky text-brand">{balances.length} {t("settlement.netBalances")}</span></div>
          <div className="mt-5 space-y-3">
            {hasInvalidDateRange ? <InlineMessage tone="error">{t("settlement.dateRangeInvalid")}</InlineMessage> : settlementQuery.isError ? <InlineMessage tone="error" title={t("feedback.loadFailed")} action={<button className="button-secondary" onClick={() => settlementQuery.refetch()} type="button">{t("common.retry")}</button>}>{getErrorMessage(settlementQuery.error)}</InlineMessage> : settlementQuery.isPending ? <LoadingState lines={4} /> : balances.length === 0 ? <EmptyState icon={<SparklesIcon className="h-6 w-6" />} title={t("settlement.noBalancesTitle")} description={t("settlement.noBalancesBody")} action={groupId ? <Link className="button-secondary" to={`/groups/${groupId}/bills#create-bill`}>{t("common.goToBills")}</Link> : undefined} /> : balances.map((balance) => { const positive = balance.netAmount >= 0; return <article key={balance.participantId} className={["list-card", positive ? "border-mint/80 bg-mint/30" : "border-amber/80 bg-amber/40"].join(" ")}><div className="flex items-center justify-between gap-4"><div><div className="text-base font-semibold tracking-tight text-ink">{balance.participantName}</div><div className="mt-1 text-sm text-muted">{positive ? t("settlement.creditors") : t("settlement.debtors")}</div></div><div className={`text-right text-xl font-semibold tracking-tight ${positive ? "text-success" : "text-danger"}`}>{formatCurrency(balance.netAmount)}</div></div></article>; })}
          </div>
        </SectionCard>

        <SectionCard id="transfer-plan" className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="section-title">{t("settlement.transferPlan")}</h2><p className="mt-2 section-copy">{t("settlement.subtitle")}</p></div><span className="tag bg-mint text-success">{transfers.length} {t("nav.settlement")}</span></div>
          <div className="mt-5 space-y-3">
            {hasInvalidDateRange ? <InlineMessage tone="error">{t("settlement.dateRangeInvalid")}</InlineMessage> : settlementQuery.isError ? <InlineMessage tone="error" title={t("feedback.loadFailed")} action={<button className="button-secondary" onClick={() => settlementQuery.refetch()} type="button">{t("common.retry")}</button>}>{getErrorMessage(settlementQuery.error)}</InlineMessage> : settlementQuery.isPending ? <LoadingState lines={3} /> : transfers.length === 0 ? <EmptyState icon={<ArrowsIcon className="h-6 w-6" />} title={t("settlement.empty")} description={balances.length === 0 ? t("settlement.noBalancesBody") : t("settlement.subtitle")} action={groupId && balances.length === 0 ? <Link className="button-secondary" to={`/groups/${groupId}/bills#create-bill`}>{t("common.goToBills")}</Link> : undefined} /> : transfers.map((transfer) => {
              const payerName = nameById[transfer.fromParticipantId] ?? transfer.fromParticipantId.slice(0, 8);
              const receiverName = nameById[transfer.toParticipantId] ?? transfer.toParticipantId.slice(0, 8);
              const actingAsPayer = actingParticipantId === transfer.fromParticipantId;
              const actingAsReceiver = actingParticipantId === transfer.toParticipantId;
              const canMarkPaid = actingAsPayer && isSettlementUnpaid(transfer.status);
              const canMarkReceived = actingAsReceiver && isSettlementPaid(transfer.status);
              return (
                <article key={transfer.transferKey} className="list-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="tag bg-amber text-ink">{payerName}</span>
                        <span className="text-muted">{t("settlement.pays")}</span>
                        <span className="tag bg-sky text-brand">{receiverName}</span>
                        <span className={`tag ${statusTone(transfer.status)}`}>{statusLabel(transfer.status, t)}</span>
                      </div>
                      {actingAsPayer && isSettlementPaid(transfer.status) ? <p className="mt-3 text-sm text-muted">{t("settlement.awaitingReceiver")}</p> : null}
                      {actingAsPayer && isSettlementReceived(transfer.status) ? <p className="mt-3 text-sm text-muted">{t("settlement.sharePayerReceivedHelp")}</p> : null}
                      {actingAsReceiver && isSettlementPaid(transfer.status) ? <p className="mt-3 text-sm text-muted">{payerName} {t("settlement.receiverPrompt")}</p> : null}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-semibold tracking-tight text-ink">{formatCurrency(transfer.amount)}</div>
                    </div>
                  </div>
                  {(canMarkPaid || canMarkReceived) && !isReadOnly ? (
                    <div className="mt-4 flex justify-end">
                      {canMarkPaid ? <button className="button-primary" disabled={isBusy} onClick={() => markPaidMutation.mutate(transfer)} type="button">{markPaidMutation.isPending ? <LoadingSpinner /> : null}{t("settlement.markPaid")}</button> : null}
                      {canMarkReceived ? <button className="button-primary" disabled={isBusy} onClick={() => markReceivedMutation.mutate(transfer)} type="button">{markReceivedMutation.isPending ? <LoadingSpinner /> : null}{t("settlement.markReceived")}</button> : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {!isGuest && groupId && canEditGroup ? (
        <SettlementShareDialog
          open={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          groupId={groupId}
          groupName={groupQuery.data?.name}
          creatorName={groupQuery.data?.createdByUserName ?? nameById[actingParticipantId] ?? balances[0]?.participantName ?? t("settlement.shareFallbackCreator")}
          fromDate={fromDate}
          toDate={toDate}
          hasInvalidDateRange={hasInvalidDateRange}
          groupStatus={groupQuery.data?.status}
          participants={participantsQuery.data ?? []}
        />
      ) : null}
      <ConfirmDialog
        open={isMarkSettledOpen}
        title={t("groups.markSettledTitle")}
        description={t("groups.markSettledBody")}
        details={groupQuery.data?.name ?? ""}
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
    </div>
  );
}

function statusLabel(status: number, t: (key: any) => string) {
  return ({
    [SETTLEMENT_STATUS.unpaid]: t("settlement.statusUnpaid"),
    [SETTLEMENT_STATUS.paid]: t("settlement.statusPaid"),
    [SETTLEMENT_STATUS.received]: t("settlement.statusReceived")
  }[status as 0 | 1 | 2]);
}

function statusTone(status: number) {
  return ({
    [SETTLEMENT_STATUS.unpaid]: "bg-amber text-ink",
    [SETTLEMENT_STATUS.paid]: "bg-sky text-brand",
    [SETTLEMENT_STATUS.received]: "bg-mint text-success"
  }[status as 0 | 1 | 2]);
}

function createSummaryImageFileName() {
  const uniqueId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `summary-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${uniqueId}-summary.png`;
}
