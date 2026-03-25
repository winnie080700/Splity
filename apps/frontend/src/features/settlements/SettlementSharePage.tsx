import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type BillDetailDto, type SettlementTransferDto, type SettlementTransferStatus } from "@api-client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";
import { AppFooter } from "@/shared/ui/AppFooter";
import { EmptyState, InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard } from "@/shared/ui/primitives";
import { CheckIcon, SparklesIcon, UsersIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";
import {
  hasSharePaymentInfo,
  hasSharePaymentTextInfo,
  prepareSettlementProofImageDataUrl,
  type SettlementSharePaymentInfo,
  type SettlementShareReceiverPaymentInfo
} from "@/features/settlements/share";
import { buildSettlementReceiptData } from "@/features/settlements/receipt";
import { getPayerFacingStatus, isSettlementPaid, isSettlementReceived, isSettlementUnpaid, SETTLEMENT_STATUS } from "@/features/settlements/status";
import { SettlementReceiptBreakdown } from "@/features/settlements/SettlementReceiptBreakdown";

type ShareStep = 1 | 2 | 3;
type ShareRole = "payer" | "receiver" | "none";
type CompletionState =
  | { kind: "paid"; amount: number; counterpartyName: string }
  | { kind: "received"; amount: number; counterpartyName: string }
  | null;

export function SettlementSharePage() {
  const { shareToken } = useParams<{ shareToken?: string }>();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [currentStep, setCurrentStep] = useState<ShareStep>(1);
  const [currentRole, setCurrentRole] = useState<ShareRole>("none");
  const [actionError, setActionError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionState>(null);
  const [proofScreenshotDataUrl, setProofScreenshotDataUrl] = useState("");
  const [pendingReceivedTransferKeys, setPendingReceivedTransferKeys] = useState<string[]>([]);

  const shareRecordQuery = useQuery({
    queryKey: ["settlement-share", shareToken],
    queryFn: () => apiClient.getSettlementShare(shareToken!),
    enabled: Boolean(shareToken),
    retry: false
  });

  const groupId = shareRecordQuery.data?.groupId ?? "";
  const fromDate = shareRecordQuery.data?.fromDateUtc ?? "";
  const toDate = shareRecordQuery.data?.toDateUtc ?? "";
  const receiverPaymentInfos = useMemo<SettlementShareReceiverPaymentInfo[]>(() => {
    return shareRecordQuery.data?.receiverPaymentInfos ?? [];
  }, [shareRecordQuery.data]);

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
    queryKey: ["bills", groupId, fromDate, toDate],
    queryFn: () => apiClient.listBills(groupId!, {
      fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDate: toDate ? new Date(toDate).toISOString() : undefined
    }),
    enabled: Boolean(groupId)
  });

  const settlementQueryKey = ["settlements", groupId, fromDate, toDate] as const;

  const settlementQuery = useQuery({
    queryKey: settlementQueryKey,
    queryFn: () => apiClient.getSettlements(groupId!, {
      fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDate: toDate ? new Date(toDate).toISOString() : undefined
    }),
    enabled: Boolean(groupId)
  });

  const billDetailIds = billsQuery.data?.map((bill) => bill.id) ?? [];
  const billDetailsQuery = useQuery({
    queryKey: ["bill-details", groupId, fromDate, toDate, billDetailIds],
    queryFn: async () => {
      if (!groupId || billDetailIds.length === 0) {
        return [] as BillDetailDto[];
      }

      return Promise.all(billDetailIds.map((billId) => apiClient.getBill(groupId, billId)));
    },
    enabled: Boolean(groupId) && billsQuery.isSuccess
  });

  const participants = participantsQuery.data ?? [];
  const receiptBills = useMemo(
    () => (billDetailsQuery.data ?? [])
      .slice()
      .sort((left, right) => new Date(right.transactionDateUtc).getTime() - new Date(left.transactionDateUtc).getTime()),
    [billDetailsQuery.data]
  );
  const transfers = settlementQuery.data?.transfers ?? [];
  const netBalances = settlementQuery.data?.netBalances ?? [];
  const participantNameById = Object.fromEntries(netBalances.map((entry) => [entry.participantId, entry.participantName]));
  const selectedParticipant = participants.find((participant) => participant.id === selectedParticipantId) ?? null;

  const outgoingTransfers = transfers.filter((transfer) => transfer.fromParticipantId === selectedParticipantId);
  const incomingTransfers = transfers.filter((transfer) => transfer.toParticipantId === selectedParticipantId);
  const pendingOutgoingTransfers = outgoingTransfers.filter((transfer) => isSettlementUnpaid(transfer.status));
  const readyToConfirmTransfers = incomingTransfers.filter((transfer) => isSettlementPaid(transfer.status));
  const totalToPay = outgoingTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const totalToReceive = incomingTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const recipientNames = Array.from(new Set(outgoingTransfers.map((transfer) => getParticipantName(participantNameById, transfer.toParticipantId))));
  const payerReceipt = useMemo(
    () => buildSettlementReceiptData({
      bills: receiptBills,
      participantId: selectedParticipantId,
      perspective: "payable",
      expectedTotalAmount: totalToPay,
      t
    }),
    [receiptBills, selectedParticipantId, t, totalToPay]
  );
  const receiverReceipt = useMemo(
    () => buildSettlementReceiptData({
      bills: receiptBills,
      participantId: selectedParticipantId,
      perspective: "receivable",
      expectedTotalAmount: totalToReceive,
      t
    }),
    [receiptBills, selectedParticipantId, t, totalToReceive]
  );
  const inferredRole = useMemo(
    () => inferShareRole({
      outgoingTransfers,
      incomingTransfers,
      pendingOutgoingTransfers,
      readyToConfirmTransfers
    }),
    [incomingTransfers, outgoingTransfers, pendingOutgoingTransfers, readyToConfirmTransfers]
  );

  useEffect(() => {
    if (!selectedParticipantId && participants.length > 0) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);

  useEffect(() => {
    setActionError(null);
    setCompletion(null);
    setProofScreenshotDataUrl("");
  }, [selectedParticipantId]);

  const inviteMessage = useMemo(() => {
    const template = t("settlement.inviteMessage");
    const creatorName = shareRecordQuery.data?.creatorName ?? groupQuery.data?.createdByUserName ?? t("settlement.shareFallbackCreator");
    return template
      .replace("{creator}", creatorName)
      .replace("{group}", groupQuery.data?.name ?? "...");
  }, [groupQuery.data?.createdByUserName, groupQuery.data?.name, shareRecordQuery.data?.creatorName, t]);

  function handleContinueFromIdentity() {
    setCurrentRole(inferredRole);
    setCurrentStep(2);
  }

  const hasErrors = shareRecordQuery.isError || groupQuery.isError || participantsQuery.isError || settlementQuery.isError || billsQuery.isError;
  const isLoading = shareRecordQuery.isPending || groupQuery.isPending || participantsQuery.isPending || settlementQuery.isPending || billsQuery.isPending;
  const isShareReadOnly = groupQuery.data?.status === "settled";

  const markPaidMutation = useMutation({
    mutationFn: async (paymentProofScreenshotDataUrl?: string) => {
      if (!groupId) throw new Error(t("settlement.shareMissingGroup"));
      if (isShareReadOnly) throw new Error(t("groups.readOnlySharePage"));
      if (!selectedParticipantId) throw new Error(t("settlement.shareIdentityRequired"));
      if (pendingOutgoingTransfers.length === 0) throw new Error(t("settlement.shareNoPendingPayment"));

      await Promise.all(
        pendingOutgoingTransfers.map((transfer) =>
          apiClient.markSettlementPaid(groupId, {
            fromParticipantId: transfer.fromParticipantId,
            toParticipantId: transfer.toParticipantId,
            amount: transfer.amount,
            fromDateUtc: fromDate ? new Date(fromDate).toISOString() : undefined,
            toDateUtc: toDate ? new Date(toDate).toISOString() : undefined,
            actorParticipantId: selectedParticipantId,
            proofScreenshotDataUrl: paymentProofScreenshotDataUrl || undefined
          })
        )
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settlements", groupId] });
      setCompletion({
        kind: "paid",
        amount: pendingOutgoingTransfers.reduce((sum, transfer) => sum + transfer.amount, 0),
        counterpartyName: recipientNames[0] ?? t("settlement.shareUnknownParticipant")
      });
      setActionError(null);
      setProofScreenshotDataUrl("");
      showToast({ title: t("settlement.markPaid"), description: t("feedback.saved"), tone: "success" });
      setCurrentStep(3);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setActionError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const markReceivedMutation = useMutation({
    mutationFn: async (transfer: SettlementTransferDto) => {
      if (!groupId) throw new Error(t("settlement.shareMissingGroup"));
      if (isShareReadOnly) throw new Error(t("groups.readOnlySharePage"));
      if (!selectedParticipantId) throw new Error(t("settlement.shareIdentityRequired"));
      if (!isSettlementPaid(transfer.status)) throw new Error(t("settlement.shareNoReceivablePayment"));

      return apiClient.markSettlementReceived(groupId, {
        fromParticipantId: transfer.fromParticipantId,
        toParticipantId: transfer.toParticipantId,
        amount: transfer.amount,
        fromDateUtc: fromDate ? new Date(fromDate).toISOString() : undefined,
        toDateUtc: toDate ? new Date(toDate).toISOString() : undefined,
        actorParticipantId: selectedParticipantId
      });
    },
    onMutate: (transfer) => {
      setPendingReceivedTransferKeys((current) => current.includes(transfer.transferKey)
        ? current
        : [...current, transfer.transferKey]);
    },
    onSuccess: async (_, transfer) => {
      const refreshedSettlements = await queryClient.fetchQuery({
        queryKey: settlementQueryKey,
        queryFn: () => apiClient.getSettlements(groupId!, {
          fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
          toDate: toDate ? new Date(toDate).toISOString() : undefined
        })
      });
      const remainingReadyToConfirm = refreshedSettlements.transfers.filter((item) =>
        item.toParticipantId === transfer.toParticipantId && isSettlementPaid(item.status));

      setCompletion({
        kind: "received",
        amount: transfer.amount,
        counterpartyName: getParticipantName(participantNameById, transfer.fromParticipantId)
      });
      setActionError(null);
      showToast({ title: t("settlement.markReceived"), description: t("feedback.saved"), tone: "success" });

      if (remainingReadyToConfirm.length === 0) {
        setCurrentStep(3);
      }
    },
    onSettled: (_, __, transfer) => {
      setPendingReceivedTransferKeys((current) => current.filter((key) => key !== transfer.transferKey));
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setActionError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
  });

  const stepItems = [
    { step: 1 as const, label: t("settlement.shareStepIdentity"), body: t("settlement.shareStepIdentityBody") },
    {
      step: 2 as const,
      label: currentRole === "receiver" ? t("settlement.shareStepSummaryReceiver") : t("settlement.shareStepSummaryPayer"),
      body: currentRole === "receiver" ? t("settlement.shareStepSummaryReceiverBody") : t("settlement.shareStepSummaryPayerBody")
    },
    {
      step: 3 as const,
      label: completion?.kind === "received" ? t("settlement.shareStepSuccessReceiver") : t("settlement.shareStepSuccessPayer"),
      body: completion?.kind === "received" ? t("settlement.shareStepSuccessReceiverBody") : t("settlement.shareStepSuccessPayerBody")
    }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[88rem] flex-1 space-y-6">
        <SectionCard className="overflow-hidden p-6 md:p-7">
          <PageHeading
            eyebrow={t("settlement.sharePageEyebrow")}
            title={groupQuery.data ? `${groupQuery.data.name} · ${t("settlement.transferPlan")}` : t("settlement.transferPlan")}
            description={inviteMessage}
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {stepItems.map((item) => {
              const active = currentStep === item.step;
              const complete = currentStep > item.step;
              return (
                <div
                  key={item.step}
                  className={[
                    "rounded-[24px] border px-4 py-4 transition",
                    active
                      ? "border-brand/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(255,255,255,0.98))] shadow-soft"
                      : complete
                        ? "border-mint bg-mint/40"
                        : "border-slate-200 bg-white/88"
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <span className={[
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
                      active ? "bg-brand text-white" : complete ? "bg-success text-white" : "bg-slate-100 text-muted"
                    ].join(" ")}>
                      {complete ? <CheckIcon className="h-4 w-4" /> : item.step}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold tracking-tight text-ink">{item.label}</div>
                      <div className="mt-1 text-xs leading-5 text-muted">{item.body}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {hasErrors ? (
          <InlineMessage tone="error" title={t("feedback.loadFailed")}>
            {getErrorMessage(shareRecordQuery.error ?? groupQuery.error ?? participantsQuery.error ?? settlementQuery.error ?? billsQuery.error)}
          </InlineMessage>
        ) : isLoading ? (
          <LoadingState lines={4} />
        ) : (
          <>
            {currentStep === 1 ? (
              <SectionCard className="p-6 md:p-7">
                <div className="max-w-2xl">
                  <h2 className="section-title">{t("settlement.shareIdentityTitle")}</h2>
                  <p className="mt-3 section-copy">{t("settlement.shareIdentityBody")}</p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {participants.length === 0 ? (
                    <div className="sm:col-span-2">
                      <EmptyState
                        icon={<UsersIcon className="h-6 w-6" />}
                        title={t("participants.emptyTitle")}
                        description={t("settlement.shareNoParticipants")}
                      />
                    </div>
                  ) : participants.map((participant) => {
                    const active = participant.id === selectedParticipantId;
                    const participantTransfers = transfers.filter((transfer) => transfer.fromParticipantId === participant.id || transfer.toParticipantId === participant.id);
                    const participantOutgoing = participantTransfers.filter((transfer) => transfer.fromParticipantId === participant.id);
                    const participantIncoming = participantTransfers.filter((transfer) => transfer.toParticipantId === participant.id);
                    const participantPendingOutgoing = participantOutgoing.filter((transfer) => isSettlementUnpaid(transfer.status));
                    const participantReadyToConfirm = participantIncoming.filter((transfer) => isSettlementPaid(transfer.status));
                    const participantRole = inferShareRole({
                      outgoingTransfers: participantOutgoing,
                      incomingTransfers: participantIncoming,
                      pendingOutgoingTransfers: participantPendingOutgoing,
                      readyToConfirmTransfers: participantReadyToConfirm
                    });
                    const participantRoleLabel = getRoleLabel(participantRole, t);
                    const participantPayerStatus = getPayerFacingStatus(participantOutgoing);
                    const participantAmount = participantRole === "payer"
                      ? participantOutgoing.reduce((sum, transfer) => sum + transfer.amount, 0)
                      : participantRole === "receiver"
                        ? participantIncoming.reduce((sum, transfer) => sum + transfer.amount, 0)
                        : 0;
                    return (
                      <button
                        key={participant.id}
                        className={[
                          "flex min-h-[88px] w-full items-center justify-between rounded-[24px] border px-5 py-4 text-left transition",
                          active
                            ? "border-brand/20 bg-brand/5 shadow-soft ring-2 ring-brand/10"
                            : "border-slate-200 bg-white/92 hover:-translate-y-0.5 hover:border-brand/20 hover:bg-white"
                        ].join(" ")}
                        onClick={() => setSelectedParticipantId(participant.id)}
                        type="button"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold tracking-tight text-ink">{participant.name}</div>
                            {participantPayerStatus === "paid" ? (
                              <span className="tag bg-mint text-success">
                                {t("settlement.shareIdentityPaid")}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-sm text-muted">{participantRoleLabel}</div>
                          {participantRole !== "none" ? (
                            <div className="mt-2 text-sm font-medium text-ink">
                              {formatCurrency(participantAmount)}
                            </div>
                          ) : null}
                        </div>
                        <span className={[
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          active ? "bg-brand text-white" : "bg-slate-100 text-muted"
                        ].join(" ")}>
                          {active ? <CheckIcon className="h-4 w-4" /> : <UsersIcon className="h-4 w-4" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <InlineMessage tone="info">{t("settlement.shareNotListed")}</InlineMessage>
                </div>

                {selectedParticipantId ? (
                  <div className="mt-4">
                    <InlineMessage tone="info">
                      {inferredRole === "payer"
                        ? t("settlement.shareIdentityPayerRoute")
                        : inferredRole === "receiver"
                          ? t("settlement.shareIdentityReceiverRoute")
                          : t("settlement.shareIdentityNoRoleRoute")}
                    </InlineMessage>
                  </div>
                ) : null}

                <div className="mt-6 flex justify-end">
                  <button
                    className="button-primary"
                    disabled={!selectedParticipantId || participants.length === 0}
                    onClick={handleContinueFromIdentity}
                    type="button"
                  >
                    {t("settlement.shareContinue")}
                  </button>
                </div>
              </SectionCard>
            ) : null}
            {currentStep === 2 ? (
              <SectionCard className="overflow-hidden p-6 md:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <h2 className="section-title">
                      {currentRole === "receiver" ? t("settlement.shareSummaryTitleReceiver") : t("settlement.shareSummaryTitlePayer")}
                    </h2>
                    <p className="mt-3 section-copy">
                      {currentRole === "receiver" ? t("settlement.shareSummaryBodyReceiver") : t("settlement.shareSummaryBodyPayer")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`tag ${currentRole === "receiver" ? "bg-mint text-success" : "bg-sky text-brand"}`}>
                      {currentRole === "receiver" ? t("settlement.shareRoleReceiver") : t("settlement.shareRolePayer")}
                    </span>
                    <span className="tag bg-slate-100 text-muted">{selectedParticipant?.name ?? t("settlement.selectParticipant")}</span>
                  </div>
                </div>
                {currentRole === "payer" ? (
                  <PayerPanel
                    groupName={groupQuery.data?.name ?? "..."}
                    isReadOnly={isShareReadOnly}
                    receipt={payerReceipt}
                    receiptError={billDetailsQuery.error}
                    receiptLoading={billDetailsQuery.isPending}
                    outgoingTransfers={outgoingTransfers}
                    selectedParticipantName={selectedParticipant?.name ?? t("settlement.shareUnknownParticipant")}
                    receiverPaymentInfos={receiverPaymentInfos}
                    participantNameById={participantNameById}
                    recipientNames={recipientNames}
                    proofScreenshotDataUrl={proofScreenshotDataUrl}
                    totalToPay={totalToPay}
                    actionError={actionError}
                    isBusy={markPaidMutation.isPending}
                    onBack={() => setCurrentStep(1)}
                    onMarkPaid={() => markPaidMutation.mutate(proofScreenshotDataUrl)}
                    onProofChange={setProofScreenshotDataUrl}
                    canMarkPaid={Boolean(selectedParticipantId) && pendingOutgoingTransfers.length > 0}
                    t={t}
                  />
                ) : null}

                {currentRole === "receiver" ? (
                  <ReceiverPanel
                    groupName={groupQuery.data?.name ?? "..."}
                    incomingTransfers={incomingTransfers}
                    isReadOnly={isShareReadOnly}
                    receipt={receiverReceipt}
                    receiptError={billDetailsQuery.error}
                    receiptLoading={billDetailsQuery.isPending}
                    readyToConfirmTransfers={readyToConfirmTransfers}
                    participantNameById={participantNameById}
                    selectedParticipantName={selectedParticipant?.name ?? t("settlement.shareUnknownParticipant")}
                    totalToReceive={totalToReceive}
                    actionError={actionError}
                    pendingTransferKeys={pendingReceivedTransferKeys}
                    onBack={() => setCurrentStep(1)}
                    onMarkReceived={(transfer) => markReceivedMutation.mutate(transfer)}
                    t={t}
                  />
                ) : null}

                {currentRole === "none" ? (
                  <div className="mt-6">
                    <EmptyState
                      icon={<SparklesIcon className="h-6 w-6" />}
                      title={t("settlement.shareNoPaymentTitle")}
                      description={t("settlement.shareNoRoleBody")}
                    />
                  </div>
                ) : null}
              </SectionCard>
            ) : null}
            {currentStep === 3 ? (
              <SectionCard className="overflow-hidden border border-mint/90 bg-[linear-gradient(180deg,rgba(240,253,244,0.92),rgba(255,255,255,0.98))] p-6 md:p-8">
                <div className="mx-auto max-w-2xl text-center">
                  <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-success shadow-soft ring-8 ring-mint/70">
                    <CheckIcon className="h-9 w-9" />
                  </span>
                  <h2 className="mt-6 text-3xl font-semibold tracking-tight text-ink">
                    {completion?.kind === "received" ? t("settlement.shareReceivedSuccessTitle") : t("settlement.shareSuccessTitle")}
                  </h2>
                  <p className="mt-3 text-base leading-7 text-muted">
                    {completion?.kind === "received" ? t("settlement.shareReceivedSuccessBody") : t("settlement.shareSuccessBody")}
                  </p>
                  <p className="mt-4 text-sm font-medium tracking-wide text-success">
                    {completion?.kind === "received" ? t("settlement.shareSuccessJokeReceiver") : t("settlement.shareSuccessJokePayer")}
                  </p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <SummaryInfoCard label={t("settlement.selectParticipant")} value={selectedParticipant?.name ?? t("settlement.shareUnknownParticipant")} />
                    <SummaryInfoCard label={completion?.kind === "received" ? t("settlement.shareCollectedFrom") : t("settlement.sharePaidTo")} value={completion?.counterpartyName ?? t("settlement.shareUnknownParticipant")} />
                    <SummaryInfoCard label={completion?.kind === "received" ? t("settlement.totalToReceive") : t("settlement.totalToPay")} value={formatCurrency(completion?.amount ?? 0)} />
                  </div>

                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <button className="button-primary" onClick={() => setCurrentStep(2)} type="button">
                      {t("settlement.shareDone")}
                    </button>
                    <button className="button-secondary" onClick={() => setCurrentStep(1)} type="button">
                      {t("settlement.shareChooseAgain")}
                    </button>
                  </div>
                </div>
              </SectionCard>
            ) : null}
          </>
        )}
      </div>
      <div className="mx-auto mt-8 w-full max-w-[88rem]">
        <AppFooter />
      </div>
    </div>
  );
}

function PayerPanel({
  groupName,
  isReadOnly,
  receipt,
  receiptError,
  receiptLoading,
  outgoingTransfers,
  selectedParticipantName,
  receiverPaymentInfos,
  participantNameById,
  recipientNames,
  proofScreenshotDataUrl,
  totalToPay,
  actionError,
  isBusy,
  onBack,
  onMarkPaid,
  onProofChange,
  canMarkPaid,
  t
}: {
  groupName: string;
  isReadOnly: boolean;
  receipt: ReturnType<typeof buildSettlementReceiptData>;
  receiptError: unknown;
  receiptLoading: boolean;
  outgoingTransfers: SettlementTransferDto[];
  selectedParticipantName: string;
  receiverPaymentInfos: SettlementShareReceiverPaymentInfo[];
  participantNameById: Record<string, string>;
  recipientNames: string[];
  proofScreenshotDataUrl: string;
  totalToPay: number;
  actionError: string | null;
  isBusy: boolean;
  onBack: () => void;
  onMarkPaid: () => void;
  onProofChange: (value: string) => void;
  canMarkPaid: boolean;
  t: (key: any) => string;
}) {
  const totalPendingAmount = outgoingTransfers.filter((transfer) => isSettlementUnpaid(transfer.status)).reduce((sum, transfer) => sum + transfer.amount, 0);
  const payerDisplayStatus = getPayerFacingStatus(outgoingTransfers);
  const payerStatus = payerDisplayStatus === "unpaid" ? t("settlement.statusUnpaid") : t("settlement.statusPaid");
  const payerStatusTone = payerDisplayStatus === "unpaid" ? "bg-amber text-ink" : "bg-mint text-success";
  const receiverLabel = recipientNames.join(", ") || t("settlement.shareNoPaymentShort");
  const helperLabel = payerDisplayStatus === "unpaid"
    ? t("settlement.sharePayerActionReady")
    : outgoingTransfers.every((transfer) => isSettlementReceived(transfer.status))
      ? t("settlement.sharePayerActionReceived")
      : t("settlement.sharePayerActionDone");
  const fallbackReceiverInfo = receiverPaymentInfos.length === 1 ? receiverPaymentInfos[0] : null;

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-[28px] border border-brand/15 bg-[linear-gradient(180deg,rgba(37,99,235,0.08),rgba(255,255,255,0.98))] p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tag bg-sky text-brand">{t("settlement.shareRolePayer")}</span>
              <span className={`tag ${payerStatusTone}`}>{payerStatus}</span>
            </div>
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-ink">{t("settlement.sharePayerHeading")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.sharePayerBody")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryInfoCard label={t("settlement.sharePayerIdentity")} value={selectedParticipantName} />
              <SummaryInfoCard label={t("participants.groupLabel")} value={groupName} />
            </div>
          </div>
          <div className="min-w-0 rounded-[24px] bg-white/92 px-5 py-5 shadow-soft lg:w-[360px] xl:w-[388px]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.sharePayerAmountLabel")}</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-ink">{formatCurrency(totalToPay)}</div>
            <div className="mt-3 text-sm leading-6 text-muted">
              {payerDisplayStatus === "unpaid" ? t("settlement.sharePayerAmountHelpUnpaid") : t("settlement.sharePayerAmountHelpPaid")}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(22rem,0.72fr)]">
        <div className="rounded-[26px] border border-slate-200 bg-white/94 p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-brand">
              <UsersIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h4 className="text-lg font-semibold tracking-tight text-ink">{t("settlement.sharePayerReceiverTitle")}</h4>
              <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.sharePayerReceiverBody")}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoRow label={t("settlement.sharePayTo")} value={receiverLabel} />
            <InfoRow label={t("settlement.sharePayerStatus")} value={payerStatus} />
          </div>

          <div className="mt-5 space-y-4">
            {outgoingTransfers.length === 0 ? (
              <InlineMessage tone="info">{t("settlement.shareMissingPaymentInfo")}</InlineMessage>
            ) : (
              outgoingTransfers.map((transfer) => {
                const receiverName = getParticipantName(participantNameById, transfer.toParticipantId);
                const receiverInfo = receiverPaymentInfos.find((entry) => entry.participantId === transfer.toParticipantId)
                  ?? fallbackReceiverInfo;
                return (
                  <ReceiverPaymentInfoCard
                    key={transfer.transferKey}
                    receiverName={receiverName}
                    paymentInfo={receiverInfo?.paymentInfo ?? null}
                    t={t}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white/94 p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint/60 text-success">
              <CheckIcon className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-lg font-semibold tracking-tight text-ink">{t("settlement.sharePayerActionTitle")}</h4>
              <p className="mt-2 text-sm leading-6 text-muted">{helperLabel}</p>
            </div>
          </div>

          {outgoingTransfers.length === 0 ? (
            <div className="mt-6">
              <EmptyState icon={<UsersIcon className="h-6 w-6" />} title={t("settlement.shareNoPaymentTitle")} description={t("settlement.shareNoPaymentBody")} />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <SummaryInfoCard label={t("settlement.shareTransferBreakdown")} value={formatCurrency(totalPendingAmount || totalToPay)} />
              <div className="space-y-3">
                {outgoingTransfers.map((transfer) => {
                  const receiverName = getParticipantName(participantNameById, transfer.toParticipantId);
                  return (
                    <div key={transfer.transferKey} className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink">{receiverName}</div>
                          <div className="mt-2">
                        <TransferStatusTag status={transfer.status} t={t} />
                          </div>
                        </div>
                        <div className="text-right text-lg font-semibold tracking-tight text-ink">{formatCurrency(transfer.amount)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {outgoingTransfers.length > 0 ? (
            <div className="mt-5">
              <PaymentProofUploader
                proofScreenshotDataUrl={proofScreenshotDataUrl}
                disabled={isBusy || isReadOnly}
                onChange={onProofChange}
                t={t}
              />
            </div>
          ) : null}

          {actionError ? <div className="mt-5"><InlineMessage tone="error">{actionError}</InlineMessage></div> : null}
          {isReadOnly ? <div className="mt-5"><InlineMessage tone="info">{t("groups.readOnlySharePage")}</InlineMessage></div> : null}

          <div className="mt-6 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-muted">
            {isReadOnly
              ? t("groups.readOnlySharePage")
              : payerDisplayStatus === "unpaid"
              ? t("settlement.shareMarkPaidHelp")
              : outgoingTransfers.every((transfer) => isSettlementReceived(transfer.status))
                ? t("settlement.sharePayerReceivedHelp")
                : t("settlement.sharePayerDoneHelp")}
          </div>

          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button className="button-secondary" onClick={onBack} type="button">{t("settlement.shareBack")}</button>
            {outgoingTransfers.length > 0 && canMarkPaid && !isReadOnly ? (
              <button className="button-primary" disabled={isBusy} onClick={onMarkPaid} type="button">
                {isBusy ? <LoadingSpinner /> : null}
                {t("settlement.markPaid")}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <SettlementReceiptBreakdown receipt={receipt} isLoading={receiptLoading} error={receiptError} t={t} />
    </div>
  );
}

function ReceiverPanel({
  groupName,
  incomingTransfers,
  isReadOnly,
  receipt,
  receiptError,
  receiptLoading,
  readyToConfirmTransfers,
  participantNameById,
  selectedParticipantName,
  totalToReceive,
  actionError,
  pendingTransferKeys,
  onBack,
  onMarkReceived,
  t
}: {
  groupName: string;
  incomingTransfers: SettlementTransferDto[];
  isReadOnly: boolean;
  receipt: ReturnType<typeof buildSettlementReceiptData>;
  receiptError: unknown;
  receiptLoading: boolean;
  readyToConfirmTransfers: SettlementTransferDto[];
  participantNameById: Record<string, string>;
  selectedParticipantName: string;
  totalToReceive: number;
  actionError: string | null;
  pendingTransferKeys: string[];
  onBack: () => void;
  onMarkReceived: (transfer: SettlementTransferDto) => void;
  t: (key: any) => string;
}) {
  const [expandedProofTransferKey, setExpandedProofTransferKey] = useState<string | null>(null);
  const settledCount = incomingTransfers.filter((transfer) => isSettlementReceived(transfer.status)).length;
  const unpaidCount = incomingTransfers.filter((transfer) => isSettlementUnpaid(transfer.status)).length;
  const paidWaitingCount = incomingTransfers.filter((transfer) => isSettlementPaid(transfer.status)).length;
  const sortedTransfers = incomingTransfers
    .slice()
    .sort((left, right) => {
      const order = {
        [SETTLEMENT_STATUS.paid]: 0,
        [SETTLEMENT_STATUS.unpaid]: 1,
        [SETTLEMENT_STATUS.received]: 2
      } as Record<SettlementTransferStatus, number>;
      const statusDelta = order[left.status] - order[right.status];
      if (statusDelta !== 0) {
        return statusDelta;
      }

      return left.amount === right.amount ? left.transferKey.localeCompare(right.transferKey) : right.amount - left.amount;
    });

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-[28px] border border-success/15 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,0.98))] p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tag bg-mint text-success">{t("settlement.shareRoleReceiver")}</span>
              <span className={`tag ${paidWaitingCount > 0 ? "bg-sky text-brand" : "bg-mint text-success"}`}>
                {paidWaitingCount > 0 ? t("settlement.shareReceiverNeedsReview") : t("settlement.shareReceiverInSync")}
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-ink">{t("settlement.shareReceiverTitle")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.shareReceiverBody")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryInfoCard label={t("settlement.shareReceiverIdentity")} value={selectedParticipantName} />
              <SummaryInfoCard label={t("participants.groupLabel")} value={groupName} />
            </div>
          </div>
          <div className="min-w-0 rounded-[24px] bg-white/92 px-5 py-5 shadow-soft lg:w-[360px] xl:w-[388px]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.shareReceiverAmountLabel")}</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-ink">{formatCurrency(totalToReceive)}</div>
            <div className="mt-3 text-sm leading-6 text-muted">{t("settlement.shareReceiverAmountHelp")}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(22rem,0.72fr)]">
        <div className="rounded-[26px] border border-slate-200 bg-white/94 p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint/60 text-success">
              <UsersIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h4 className="text-lg font-semibold tracking-tight text-ink">{t("settlement.shareReceiverListTitle")}</h4>
              <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.shareReceiverListBody")}</p>
            </div>
          </div>

          {incomingTransfers.length === 0 ? (
            <div className="mt-6">
              <EmptyState icon={<SparklesIcon className="h-6 w-6" />} title={t("settlement.shareNoReceivableTitle")} description={t("settlement.shareNoReceivableBody")} />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {sortedTransfers.map((transfer) => {
                const payerName = getParticipantName(participantNameById, transfer.fromParticipantId);
                const canMarkReceived = isSettlementPaid(transfer.status) && !isReadOnly;
                const isTransferPending = pendingTransferKeys.includes(transfer.transferKey);
                const hasProof = Boolean(transfer.proofScreenshotDataUrl);
                const proofExpanded = expandedProofTransferKey === transfer.transferKey;
                return (
                  <article key={transfer.transferKey} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-base font-semibold tracking-tight text-ink">{payerName}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <TransferStatusTag status={transfer.status} t={t} />
                          <span className="text-sm text-muted">{receiverStatusHint(transfer.status, t)}</span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-sm text-muted">{t("settlement.shareReceiverAmountDue")}</div>
                        <div className="mt-1 text-xl font-semibold tracking-tight text-ink">{formatCurrency(transfer.amount)}</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ReceiverProofSection
                        status={transfer.status}
                        proofScreenshotDataUrl={transfer.proofScreenshotDataUrl}
                        isExpanded={proofExpanded}
                        onToggle={() => setExpandedProofTransferKey((current) => current === transfer.transferKey ? null : transfer.transferKey)}
                        t={t}
                      />
                    </div>
                    <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm leading-6 text-muted">
                        {receiverActionHint(transfer.status, hasProof, t)}
                      </div>
                      {canMarkReceived ? (
                        <button className="button-primary" disabled={isTransferPending} onClick={() => onMarkReceived(transfer)} type="button">
                          {isTransferPending ? <LoadingSpinner /> : null}
                          {t("settlement.markReceived")}
                        </button>
                      ) : (
                        <span className={`tag ${isSettlementReceived(transfer.status) ? "bg-mint text-success" : "bg-slate-100 text-muted"}`}>
                          {isSettlementReceived(transfer.status) ? t("settlement.shareReceiverConfirmed") : t("settlement.shareWaitingForPayer")}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white/94 p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint/60 text-success">
              <SparklesIcon className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-lg font-semibold tracking-tight text-ink">{t("settlement.shareReceiverSummaryTitle")}</h4>
              <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.shareReceiverSummaryBody")}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <SummaryInfoCard label={t("settlement.shareReceiverPayers")} value={String(incomingTransfers.length).padStart(2, "0")} />
            <SummaryInfoCard label={t("settlement.shareAwaitingReview")} value={String(readyToConfirmTransfers.length).padStart(2, "0")} />
            <SummaryInfoCard label={t("settlement.shareReceiverUnpaidCount")} value={String(unpaidCount).padStart(2, "0")} />
            <SummaryInfoCard label={t("settlement.shareSettledCount")} value={String(settledCount).padStart(2, "0")} />
          </div>

          {actionError ? <div className="mt-5"><InlineMessage tone="error">{actionError}</InlineMessage></div> : null}
          {isReadOnly ? <div className="mt-5"><InlineMessage tone="info">{t("groups.readOnlySharePage")}</InlineMessage></div> : null}

          <div className="mt-5 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-muted">
            {isReadOnly ? t("groups.readOnlySharePage") : t("settlement.shareMarkReceivedHelp")}
          </div>
          <div className="mt-6 flex justify-start">
            <button className="button-secondary" onClick={onBack} type="button">{t("settlement.shareBack")}</button>
          </div>
        </div>
      </div>

      <SettlementReceiptBreakdown receipt={receipt} isLoading={receiptLoading} error={receiptError} t={t} />
    </div>
  );
}

function ReceiverProofSection({
  status,
  proofScreenshotDataUrl,
  isExpanded,
  onToggle,
  t
}: {
  status: SettlementTransferStatus;
  proofScreenshotDataUrl?: string;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: any) => string;
}) {
  const hasProof = Boolean(proofScreenshotDataUrl);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white/88 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.proofReceiverTitle")}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`tag ${hasProof ? "bg-sky text-brand" : "bg-slate-100 text-muted"}`}>
              {hasProof ? t("settlement.proofAttached") : t("settlement.proofMissing")}
            </span>
            <span className="text-sm leading-6 text-muted">{receiverProofHint(status, hasProof, t)}</span>
          </div>
        </div>
        {hasProof ? (
          <button className="button-secondary" onClick={onToggle} type="button">
            {isExpanded ? t("settlement.proofHide") : t("settlement.proofView")}
          </button>
        ) : null}
      </div>

      {hasProof && isExpanded ? (
        <div className="mt-4">
          <TransferProofCard proofScreenshotDataUrl={proofScreenshotDataUrl!} t={t} />
        </div>
      ) : null}
    </div>
  );
}

function SummaryInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-4 text-left">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-2 text-base font-semibold text-ink">{value}</div>
    </div>
  );
}

function ReceiverPaymentInfoCard({
  receiverName,
  paymentInfo,
  t
}: {
  receiverName: string;
  paymentInfo: SettlementSharePaymentInfo | null;
  t: (key: any) => string;
}) {
  const paymentTextAvailable = hasSharePaymentTextInfo(paymentInfo);

  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink">{receiverName}</div>
          <div className="mt-1 text-sm text-muted">{t("settlement.sharePayerReceiverBody")}</div>
        </div>
        <span className={`tag ${paymentInfo && hasSharePaymentInfo(paymentInfo) ? "bg-sky text-brand" : "bg-slate-100 text-muted"}`}>
          {paymentInfo && hasSharePaymentInfo(paymentInfo) ? t("settlement.receiverInfoShared") : t("settlement.receiverInfoNotProvided")}
        </span>
      </div>

      {paymentInfo && hasSharePaymentInfo(paymentInfo) ? (
        <div className="mt-4 space-y-4">
          {paymentTextAvailable ? (
            <div className="grid gap-3 md:grid-cols-2">
              {paymentInfo.payeeName ? <InfoRow label={t("settlement.payeeName")} value={paymentInfo.payeeName} /> : null}
              {paymentInfo.paymentMethod ? <InfoRow label={t("settlement.paymentMethod")} value={paymentInfo.paymentMethod} /> : null}
              {paymentInfo.accountName ? <InfoRow label={t("settlement.accountName")} value={paymentInfo.accountName} /> : null}
              {paymentInfo.accountNumber ? <InfoRow label={t("settlement.accountNumber")} value={paymentInfo.accountNumber} /> : null}
              {paymentInfo.notes ? (
                <div className="rounded-[20px] border border-slate-200 bg-white/90 px-4 py-3 md:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.notes")}</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{paymentInfo.notes}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {paymentInfo.paymentQrDataUrl ? (
            <PaymentQrPanel paymentQrDataUrl={paymentInfo.paymentQrDataUrl} t={t} />
          ) : null}

          {!paymentTextAvailable && !paymentInfo.paymentQrDataUrl ? (
            <div className="rounded-[20px] border border-slate-200 bg-white/90 px-4 py-3 text-sm leading-6 text-muted">
              {t("settlement.shareMissingPaymentInfo")}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-dashed border-slate-200 bg-white/90 px-4 py-3 text-sm leading-6 text-muted">
          {t("settlement.shareMissingPaymentInfo")}
        </div>
      )}
    </div>
  );
}

function PaymentQrPanel({
  paymentQrDataUrl,
  t
}: {
  paymentQrDataUrl: string;
  t: (key: any) => string;
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [paymentQrDataUrl]);

  return (
    <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.paymentQrSectionTitle")}</div>
      <div className="mt-2 text-sm leading-6 text-muted">{t("settlement.paymentQrSectionBody")}</div>

      {imageError ? (
        <div className="mt-4">
          <InlineMessage tone="error">{t("settlement.paymentQrLoadFailed")}</InlineMessage>
        </div>
      ) : (
        <div className="mt-4 flex justify-center rounded-[20px] border border-dashed border-slate-200 bg-white p-4">
          <img
            src={paymentQrDataUrl}
            alt={t("settlement.paymentQrAlt")}
            className="max-h-64 w-full max-w-[240px] rounded-[18px] object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      )}
    </div>
  );
}

function PaymentProofUploader({
  proofScreenshotDataUrl,
  disabled,
  onChange,
  t
}: {
  proofScreenshotDataUrl: string;
  disabled: boolean;
  onChange: (value: string) => void;
  t: (key: any) => string;
}) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsPreparing(true);
      setUploadError(null);
      const dataUrl = await prepareSettlementProofImageDataUrl(file);
      onChange(dataUrl);
    }
    catch (error) {
      setUploadError(error instanceof Error
        ? ({
            "unsupported-file": t("settlement.proofInvalid"),
            "file-too-large": t("settlement.proofTooLarge"),
            "file-read-failed": t("settlement.proofReadFailed"),
            "image-load-failed": t("settlement.proofReadFailed")
          }[error.message] ?? t("settlement.proofReadFailed"))
        : t("settlement.proofReadFailed"));
    }
    finally {
      setIsPreparing(false);
      event.target.value = "";
    }
  }

  return (
    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-ink">{t("settlement.proofLabel")}</div>
          <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.proofBody")}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.proofBodyLight")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
          />
          <button className="button-secondary" disabled={disabled || isPreparing} onClick={() => inputRef.current?.click()} type="button">
            {isPreparing ? <LoadingSpinner /> : null}
            {proofScreenshotDataUrl ? t("settlement.proofReplace") : t("settlement.proofUpload")}
          </button>
          {proofScreenshotDataUrl ? (
            <button className="button-pill" disabled={disabled || isPreparing} onClick={() => onChange("")} type="button">
              {t("settlement.proofRemove")}
            </button>
          ) : null}
        </div>
      </div>

      {proofScreenshotDataUrl ? (
        <div className="mt-4">
          <TransferProofCard proofScreenshotDataUrl={proofScreenshotDataUrl} t={t} previewLabel={t("settlement.proofPreview")} />
        </div>
      ) : (
        <div className="mt-4 text-sm leading-6 text-muted">{t("settlement.proofEmpty")}</div>
      )}

      {uploadError ? (
        <div className="mt-4">
          <InlineMessage tone="error">{uploadError}</InlineMessage>
        </div>
      ) : null}
    </div>
  );
}

function TransferProofCard({
  proofScreenshotDataUrl,
  t,
  previewLabel
}: {
  proofScreenshotDataUrl: string;
  t: (key: any) => string;
  previewLabel?: string;
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [proofScreenshotDataUrl]);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white/90 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{previewLabel ?? t("settlement.proofReceiverTitle")}</div>
      <div className="mt-2 text-sm leading-6 text-muted">{t("settlement.proofReceiverBody")}</div>
      {imageError ? (
        <div className="mt-3">
          <InlineMessage tone="error">{t("settlement.proofLoadFailed")}</InlineMessage>
        </div>
      ) : (
        <div className="mt-3 flex justify-center rounded-[18px] bg-slate-50/80 p-3">
          <img
            src={proofScreenshotDataUrl}
            alt={t("settlement.proofAlt")}
            className="max-h-56 w-full max-w-[280px] rounded-[14px] object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      )}
    </div>
  );
}

function getParticipantName(participantNameById: Record<string, string>, participantId: string) {
  return participantNameById[participantId] ?? participantId.slice(0, 8);
}

function inferShareRole({
  outgoingTransfers,
  incomingTransfers,
  pendingOutgoingTransfers,
  readyToConfirmTransfers
}: {
  outgoingTransfers: SettlementTransferDto[];
  incomingTransfers: SettlementTransferDto[];
  pendingOutgoingTransfers: SettlementTransferDto[];
  readyToConfirmTransfers: SettlementTransferDto[];
}): ShareRole {
  if (pendingOutgoingTransfers.length > 0) {
    return "payer";
  }

  if (readyToConfirmTransfers.length > 0) {
    return "receiver";
  }

  if (outgoingTransfers.length > 0) {
    return "payer";
  }

  if (incomingTransfers.length > 0) {
    return "receiver";
  }

  return "none";
}

function getRoleLabel(role: ShareRole, t: (key: any) => string) {
  return ({
    payer: t("settlement.shareIdentityRolePayer"),
    receiver: t("settlement.shareIdentityRoleReceiver"),
    none: t("settlement.shareIdentityRoleNone")
  }[role]);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-2 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function TransferStatusTag({ status, t }: { status: SettlementTransferStatus; t: (key: any) => string }) {
  return <span className={`tag ${statusTone(status)}`}>{statusLabel(status, t)}</span>;
}

function statusLabel(status: SettlementTransferStatus, t: (key: any) => string) {
  return ({
    [SETTLEMENT_STATUS.unpaid]: t("settlement.statusUnpaid"),
    [SETTLEMENT_STATUS.paid]: t("settlement.statusPaid"),
    [SETTLEMENT_STATUS.received]: t("settlement.statusReceivedShort")
  }[status]);
}

function statusTone(status: SettlementTransferStatus) {
  return ({
    [SETTLEMENT_STATUS.unpaid]: "bg-amber text-ink",
    [SETTLEMENT_STATUS.paid]: "bg-sky text-brand",
    [SETTLEMENT_STATUS.received]: "bg-mint text-success"
  }[status]);
}

function receiverStatusHint(status: SettlementTransferStatus, t: (key: any) => string) {
  return ({
    0: t("settlement.shareReceiverStatusUnpaid"),
    1: t("settlement.shareReceiverStatusPaid"),
    2: t("settlement.shareReceiverStatusReceived")
  }[status]);
}

function receiverProofHint(status: SettlementTransferStatus, hasProof: boolean, t: (key: any) => string) {
  return ({
    [SETTLEMENT_STATUS.unpaid]: hasProof ? t("settlement.proofStatusUnpaidAttached") : t("settlement.proofStatusUnpaidMissing"),
    [SETTLEMENT_STATUS.paid]: hasProof ? t("settlement.proofStatusPaidAttached") : t("settlement.proofStatusPaidMissing"),
    [SETTLEMENT_STATUS.received]: hasProof ? t("settlement.proofStatusReceivedAttached") : t("settlement.proofStatusReceivedMissing")
  }[status]);
}

function receiverActionHint(status: SettlementTransferStatus, hasProof: boolean, t: (key: any) => string) {
  if (isSettlementPaid(status)) {
    return hasProof ? t("settlement.proofStatusPaidAttached") : t("settlement.proofStatusPaidMissing");
  }

  if (isSettlementReceived(status)) {
    return hasProof ? t("settlement.proofStatusReceivedAttached") : t("settlement.proofStatusReceivedMissing");
  }

  return hasProof ? t("settlement.proofStatusUnpaidAttached") : t("settlement.proofStatusUnpaidMissing");
}
