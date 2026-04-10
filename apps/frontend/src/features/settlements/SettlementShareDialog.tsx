import { useQuery } from "@tanstack/react-query";
import { apiClient, type GroupStatus } from "@api-client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { InlineMessage, LoadingSpinner, SectionCard } from "@/shared/ui/primitives";
import { CheckIcon, LinkIcon, SparklesIcon, WalletIcon } from "@/shared/ui/icons";
import { ModalDialog } from "@/shared/ui/dialog";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useToast } from "@/shared/ui/toast";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";
import {
  createEmptySharePaymentInfo,
  hasSharePaymentInfo,
  prepareSettlementShareQrDataUrl,
  type SettlementSharePaymentInfo,
  type SettlementShareReceiverPaymentInfo
} from "@/features/settlements/share";

type ShareSetupStep = 1 | 2;

export function SettlementShareDialog({
  open,
  onClose,
  groupId,
  groupName,
  creatorName,
  fromDate,
  toDate,
  hasInvalidDateRange,
  groupStatus
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName?: string;
  creatorName?: string;
  fromDate: string;
  toDate: string;
  hasInvalidDateRange: boolean;
  groupStatus?: GroupStatus;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<ShareSetupStep>(1);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [receiverInfos, setReceiverInfos] = useState<SettlementShareReceiverPaymentInfo[]>([]);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [preparingQrParticipantId, setPreparingQrParticipantId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const qrInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const seededStateRef = useRef("");

  const isReadOnly = groupStatus === "settled";
  const canSystemShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const currentShareQuery = useQuery({
    queryKey: ["current-settlement-share", groupId],
    queryFn: () => apiClient.getCurrentSettlementShare(groupId),
    enabled: open && Boolean(groupId),
    retry: false
  });

  const hasSavedShare = Boolean(currentShareQuery.data);
  const useSavedShareContext = hasSavedShare && !isRegenerating;
  const currentFromDateUtc = normalizeDialogDate(fromDate);
  const currentToDateUtc = normalizeDialogDate(toDate);
  const activeFromDateUtc = useSavedShareContext ? currentShareQuery.data?.fromDateUtc : currentFromDateUtc;
  const activeToDateUtc = useSavedShareContext ? currentShareQuery.data?.toDateUtc : currentToDateUtc;
  const hasCreationDateError = !useSavedShareContext && hasInvalidDateRange;

  const settlementQuery = useQuery({
    queryKey: ["settlement-share-preview", groupId, activeFromDateUtc ?? "", activeToDateUtc ?? "", useSavedShareContext ? "saved" : "draft"],
    queryFn: () => apiClient.getSettlements(groupId, {
      fromDate: activeFromDateUtc,
      toDate: activeToDateUtc
    }),
    enabled: open && Boolean(groupId) && (!hasCreationDateError || useSavedShareContext)
  });

  const receivers = useMemo(() => {
    const netBalances = settlementQuery.data?.netBalances ?? [];
    return netBalances
      .filter((entry) => entry.netAmount > 0)
      .sort((left, right) => right.netAmount - left.netAmount || left.participantName.localeCompare(right.participantName))
      .map((entry) => ({
        participantId: entry.participantId,
        participantName: entry.participantName,
        amount: entry.netAmount
      }));
  }, [settlementQuery.data?.netBalances]);

  const stepItems = [
    { step: 1 as const, label: t("settlement.shareStepReceivers"), body: t("settlement.shareStepReceiversBody") },
    { step: 2 as const, label: t("settlement.shareStepLink"), body: t("settlement.shareStepLinkBody") }
  ];

  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setIsRegenerating(false);
      setReceiverInfos([]);
      setGeneratedLink("");
      setDialogError(null);
      seededStateRef.current = "";
      return;
    }

    setDialogError(null);
  }, [open]);

  useEffect(() => {
    if (!open || !settlementQuery.isSuccess) {
      return;
    }

    const seedKey = [
      currentShareQuery.data?.shareToken ?? "new",
      useSavedShareContext ? "saved" : "draft",
      activeFromDateUtc ?? "",
      activeToDateUtc ?? "",
      receivers.map((receiver) => receiver.participantId).join(",")
    ].join("|");

    if (seededStateRef.current === seedKey) {
      return;
    }

    const seededReceivers = receivers.map((receiver) => {
      const existing =
        currentShareQuery.data?.receiverPaymentInfos.find((entry) => entry.participantId === receiver.participantId) ??
        null;
      const shouldUseSavedProfile = matchesParticipantName(receiver.participantName, user?.name);
      const savedProfile = shouldUseSavedProfile
        ? normalizeSavedPaymentProfile(user?.paymentProfile)
        : createEmptySharePaymentInfo();

      return {
        participantId: receiver.participantId,
        participantName: receiver.participantName,
        paymentInfo: existing?.paymentInfo ?? savedProfile
      };
    });

    setReceiverInfos(seededReceivers);
    setGeneratedLink(currentShareQuery.data ? buildShareUrl(currentShareQuery.data.shareToken) : "");
    setCurrentStep(1);
    seededStateRef.current = seedKey;
  }, [
    activeFromDateUtc,
    activeToDateUtc,
    currentShareQuery.data,
    open,
    receivers,
    settlementQuery.isSuccess,
    useSavedShareContext,
    user?.name,
    user?.paymentProfile
  ]);

  const receiverInfoCount = receiverInfos.filter((entry) => hasSharePaymentInfo(entry.paymentInfo)).length;
  const shareGeneratedAtLabel = useMemo(
    () => groupName ? `${groupName} · ${t("settlement.shareAction")}` : t("settlement.shareAction"),
    [groupName, t]
  );

  function updateReceiverField(participantId: string, field: keyof SettlementSharePaymentInfo, value: string) {
    setReceiverInfos((current) => current.map((entry) => (
      entry.participantId === participantId
        ? { ...entry, paymentInfo: { ...entry.paymentInfo, [field]: value } }
        : entry
    )));
    if (!useSavedShareContext) {
      setGeneratedLink("");
    }
  }

  async function handleQrSelected(participantId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setPreparingQrParticipantId(participantId);
      const dataUrl = await prepareSettlementShareQrDataUrl(file);
      updateReceiverField(participantId, "paymentQrDataUrl", dataUrl);
      showToast({
        title: t("settlement.shareQrReady"),
        description: t("settlement.shareQrReadyBody"),
        tone: "success"
      });
    }
    catch (error) {
      const message = error instanceof Error
        ? ({
            "unsupported-file": t("settlement.shareQrInvalid"),
            "file-too-large": t("settlement.shareQrTooLarge"),
            "file-read-failed": t("settlement.shareQrReadFailed"),
            "image-load-failed": t("settlement.shareQrReadFailed")
          }[error.message] ?? t("settlement.shareQrReadFailed"))
        : t("settlement.shareQrReadFailed");
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
    finally {
      setPreparingQrParticipantId(null);
      event.target.value = "";
    }
  }

  async function handleSaveShare() {
    try {
      setIsGenerating(true);
      setDialogError(null);

      const result = await apiClient.createSettlementShare(groupId, {
        fromDateUtc: currentFromDateUtc,
        toDateUtc: currentToDateUtc,
        creatorName: creatorName?.trim() || undefined,
        receiverPaymentInfos: receiverInfos.map((entry) => ({
          participantId: entry.participantId,
          paymentInfo: entry.paymentInfo
        })),
        regenerate: isRegenerating
      });

      setGeneratedLink(buildShareUrl(result.shareToken));
      setIsRegenerating(false);
      seededStateRef.current = "";
      await currentShareQuery.refetch();
      showToast({
        title: isRegenerating ? t("settlement.shareRegenerated") : t("settlement.shareLinkReady"),
        description: receiverInfoCount > 0 ? t("settlement.shareWithPaymentInfo") : t("settlement.shareWithoutPaymentInfo"),
        tone: "success"
      });
    }
    catch (error) {
      const message = getErrorMessage(error);
      setDialogError(message);
      showToast({ title: t("feedback.requestFailed"), description: message, tone: "error" });
    }
    finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyLink() {
    if (!generatedLink) {
      return;
    }

    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(generatedLink);
      showToast({ title: t("settlement.copyShareLink"), description: t("feedback.linkCopied"), tone: "success" });
    }
    catch {
      showToast({ title: t("feedback.requestFailed"), description: t("settlement.copyFailed"), tone: "error" });
    }
    finally {
      setIsCopying(false);
    }
  }

  async function handleSystemShare() {
    if (!generatedLink || !canSystemShare) {
      return;
    }

    try {
      setIsSharing(true);
      await navigator.share({
        title: shareGeneratedAtLabel,
        text: t("settlement.shareHint"),
        url: generatedLink
      });
    }
    catch {
      // Ignore user-cancelled system share.
    }
    finally {
      setIsSharing(false);
    }
  }

  function handleRegenerate() {
    if (isReadOnly) {
      return;
    }

    setIsRegenerating(true);
    setCurrentStep(1);
    setGeneratedLink("");
    seededStateRef.current = "";
  }

  const isBusy = currentShareQuery.isPending || settlementQuery.isPending;
  const hasError = currentShareQuery.isError || settlementQuery.isError;
  const loadError = getErrorMessage(currentShareQuery.error ?? settlementQuery.error);

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title={t("settlement.shareAction")}
      description={isReadOnly ? t("settlement.shareReadOnlyBody") : t("settlement.shareStepFlowBody")}
      className="max-w-5xl"
      actions={
        <>
          {currentStep === 2 ? (
            <button className="button-secondary" onClick={() => setCurrentStep(1)} type="button">
              {t("settlement.shareBack")}
            </button>
          ) : null}
          <button className="button-secondary" onClick={onClose} type="button">
            {t("common.dismiss")}
          </button>
          {currentStep === 1 ? (
            <button
              className="button-primary"
              disabled={isBusy || hasError || hasCreationDateError}
              onClick={() => setCurrentStep(2)}
              type="button"
            >
              {t("settlement.shareContinueToLink")}
            </button>
          ) : null}
          {currentStep === 2 && (!hasSavedShare || isRegenerating) && !isReadOnly ? (
            <button
              className="button-primary"
              disabled={isGenerating || isBusy || hasError || hasCreationDateError}
              onClick={handleSaveShare}
              type="button"
            >
              {isGenerating ? <LoadingSpinner /> : null}
              {isRegenerating ? t("settlement.shareRegenerateAction") : t("settlement.generateLink")}
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          {stepItems.map((item) => {
            const isActive = currentStep === item.step;
            const isComplete = currentStep > item.step;
            return (
              <div
                key={item.step}
                className={[
                  "rounded-[24px] border px-4 py-4 transition",
                  isActive
                    ? "border-brand/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(255,255,255,0.98))] shadow-soft"
                    : isComplete
                      ? "border-mint bg-mint/35"
                      : "border-slate-200 bg-white/88"
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <span className={[
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
                    isActive ? "bg-brand text-white" : isComplete ? "bg-success text-white" : "bg-slate-100 text-muted"
                  ].join(" ")}>
                    {isComplete ? <CheckIcon className="h-4 w-4" /> : item.step}
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

        {hasCreationDateError ? (
          <InlineMessage tone="error">{t("settlement.dateRangeInvalid")}</InlineMessage>
        ) : null}

        {hasError ? (
          <InlineMessage tone="error">{loadError}</InlineMessage>
        ) : null}

        {dialogError ? (
          <InlineMessage tone="error">{dialogError}</InlineMessage>
        ) : null}

        {isBusy ? (
          <SectionCard className="flex min-h-[220px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-muted">
              <LoadingSpinner />
              {t("common.loading")}
            </div>
          </SectionCard>
        ) : null}

        {!isBusy && !hasError && currentStep === 1 ? (
          <div className="space-y-5">
            <SectionCard className="border border-brand/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.06),rgba(255,255,255,0.98))] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tag bg-white text-brand shadow-soft">{t("settlement.receiverInfoOptional")}</span>
                {useSavedShareContext ? (
                  <span className="tag bg-slate-100 text-muted">{t("settlement.shareSavedState")}</span>
                ) : null}
                {isRegenerating ? (
                  <span className="tag bg-amber text-ink">{t("settlement.shareRegeneratingState")}</span>
                ) : null}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand shadow-soft">
                  <WalletIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-ink">{t("settlement.receiverInfoStepTitle")}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.receiverInfoStepBody")}</p>
                </div>
              </div>

              {isReadOnly ? (
                <div className="mt-4">
                  <InlineMessage tone="info">{t("settlement.shareReadOnlyBody")}</InlineMessage>
                </div>
              ) : hasSavedShare && !isRegenerating ? (
                <div className="mt-4">
                  <InlineMessage tone="info">{t("settlement.shareSavedLockedHint")}</InlineMessage>
                </div>
              ) : null}
            </SectionCard>

            {receivers.length === 0 ? (
              <SectionCard className="border border-dashed border-slate-200 bg-slate-50/80 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-muted">
                    <SparklesIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-ink">{t("settlement.shareNoReceiversTitle")}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.shareNoReceiversBody")}</p>
                  </div>
                </div>
              </SectionCard>
            ) : (
              <div className="space-y-4">
                {receivers.map((receiver) => {
                  const receiverInfo = receiverInfos.find((entry) => entry.participantId === receiver.participantId) ?? {
                    participantId: receiver.participantId,
                    participantName: receiver.participantName,
                    paymentInfo: createEmptySharePaymentInfo()
                  };
                  const disabled = isReadOnly || (hasSavedShare && !isRegenerating);
                  const isPreparingQr = preparingQrParticipantId === receiver.participantId;

                  return (
                    <SectionCard key={receiver.participantId} className="border border-slate-200 bg-white p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.shareReceiverLabel")}</div>
                          <div className="mt-2 text-xl font-semibold tracking-tight text-ink">{receiver.participantName}</div>
                          <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-muted">
                            {t("settlement.shareReceiverAmount")} {formatCurrency(receiver.amount)}
                          </div>
                        </div>
                        <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-muted lg:max-w-sm">
                          {t("settlement.shareReceiverInfoHint")}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-muted">{t("settlement.payeeName")}</span>
                          <input
                            className="input-base"
                            disabled={disabled}
                            value={receiverInfo.paymentInfo.payeeName}
                            onChange={(event) => updateReceiverField(receiver.participantId, "payeeName", event.target.value)}
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-muted">{t("settlement.paymentMethod")}</span>
                          <input
                            className="input-base"
                            disabled={disabled}
                            value={receiverInfo.paymentInfo.paymentMethod}
                            onChange={(event) => updateReceiverField(receiver.participantId, "paymentMethod", event.target.value)}
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-muted">{t("settlement.accountName")}</span>
                          <input
                            className="input-base"
                            disabled={disabled}
                            value={receiverInfo.paymentInfo.accountName}
                            onChange={(event) => updateReceiverField(receiver.participantId, "accountName", event.target.value)}
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-muted">{t("settlement.accountNumber")}</span>
                          <input
                            className="input-base"
                            disabled={disabled}
                            value={receiverInfo.paymentInfo.accountNumber}
                            onChange={(event) => updateReceiverField(receiver.participantId, "accountNumber", event.target.value)}
                          />
                        </label>
                      </div>

                      <label className="mt-3 block space-y-2">
                        <span className="text-sm font-medium text-muted">{t("settlement.notes")}</span>
                        <textarea
                          className="input-base min-h-[96px] resize-y py-3"
                          disabled={disabled}
                          value={receiverInfo.paymentInfo.notes}
                          onChange={(event) => updateReceiverField(receiver.participantId, "notes", event.target.value)}
                        />
                      </label>

                      <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-ink">{t("settlement.paymentQrLabel")}</div>
                            <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.paymentQrBody")}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <input
                              ref={(element) => {
                                qrInputRefs.current[receiver.participantId] = element;
                              }}
                              className="hidden"
                              type="file"
                              accept="image/*"
                              onChange={(event) => handleQrSelected(receiver.participantId, event)}
                            />
                            <button
                              className="button-secondary"
                              disabled={disabled || isPreparingQr}
                              onClick={() => qrInputRefs.current[receiver.participantId]?.click()}
                              type="button"
                            >
                              {isPreparingQr ? <LoadingSpinner /> : null}
                              {receiverInfo.paymentInfo.paymentQrDataUrl ? t("settlement.paymentQrReplace") : t("settlement.paymentQrUpload")}
                            </button>
                            {receiverInfo.paymentInfo.paymentQrDataUrl ? (
                              <button
                                className="button-pill"
                                disabled={disabled}
                                onClick={() => updateReceiverField(receiver.participantId, "paymentQrDataUrl", "")}
                                type="button"
                              >
                                {t("settlement.paymentQrRemove")}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {receiverInfo.paymentInfo.paymentQrDataUrl ? (
                          <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.paymentQrPreview")}</div>
                            <div className="mt-3 flex justify-center rounded-[18px] bg-slate-50/80 p-3">
                              <img
                                src={receiverInfo.paymentInfo.paymentQrDataUrl}
                                alt={t("settlement.paymentQrAlt")}
                                className="max-h-48 w-auto rounded-[16px] object-contain"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 text-sm leading-6 text-muted">{t("settlement.paymentQrEmpty")}</div>
                        )}
                      </div>
                    </SectionCard>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {!isBusy && !hasError && currentStep === 2 ? (
          <div className="space-y-5">
            <SectionCard className="border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tag bg-sky text-brand">{t("settlement.generateLinkTitle")}</span>
                    {hasSavedShare && !isRegenerating ? (
                      <span className="tag bg-slate-100 text-muted">{t("settlement.shareFixedLinkBadge")}</span>
                    ) : null}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{t("settlement.shareLinkStepTitle")}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.shareLinkStepBody")}</p>
                </div>
                {generatedLink ? (
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-muted lg:max-w-sm">
                    {hasSavedShare && !isRegenerating ? t("settlement.shareFixedLinkBody") : t("settlement.generateHint")}
                  </div>
                ) : null}
              </div>

              {currentShareQuery.data?.createdAtUtc ? (
                <div className="mt-4 text-sm text-muted">
                  {t("settlement.shareCreatedAt")} {formatDate(currentShareQuery.data.createdAtUtc)}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <SummaryCard label={t("settlement.shareReceiverCount")} value={String(receivers.length).padStart(2, "0")} />
                <SummaryCard label={t("settlement.shareReceiverInfoCount")} value={String(receiverInfoCount).padStart(2, "0")} />
                <SummaryCard
                  label={t("settlement.shareStatusLabel")}
                  value={hasSavedShare && !isRegenerating ? t("settlement.shareSavedState") : t("settlement.shareDraftState")}
                />
              </div>

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.shareLinkBlockTitle")}</div>
                <div className="mt-2 text-sm leading-6 text-muted">
                  {generatedLink ? t("settlement.shareLinkBlockBody") : t("settlement.shareCreateFirst")}
                </div>
                <div className="mt-3 break-all text-sm leading-6 text-ink">{generatedLink || t("settlement.generatedLink")}</div>
              </div>

              {generatedLink ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button className="button-primary" disabled={isCopying} onClick={handleCopyLink} type="button">
                    {isCopying ? <LoadingSpinner /> : <LinkIcon className="h-4 w-4" />}
                    {t("settlement.copyShareLink")}
                  </button>
                  {canSystemShare ? (
                    <button className="button-secondary" disabled={isSharing} onClick={handleSystemShare} type="button">
                      {isSharing ? <LoadingSpinner /> : <CheckIcon className="h-4 w-4" />}
                      {t("settlement.systemShare")}
                    </button>
                  ) : null}
                  {hasSavedShare && !isRegenerating && !isReadOnly ? (
                    <button className="button-secondary" onClick={handleRegenerate} type="button">
                      {t("settlement.shareRegenerateAction")}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {isReadOnly ? (
                <div className="mt-5">
                  <InlineMessage tone="info">{t("settlement.shareReadOnlyBody")}</InlineMessage>
                </div>
              ) : null}
            </SectionCard>

            <div className="space-y-4">
              {receiverInfos.length === 0 ? (
                <SectionCard className="border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm leading-6 text-muted">
                  {t("settlement.shareNoReceiversBody")}
                </SectionCard>
              ) : (
                receiverInfos.map((receiver) => {
                  const hasInfo = hasSharePaymentInfo(receiver.paymentInfo);
                  return (
                    <SectionCard key={receiver.participantId} className="border border-slate-200 bg-white p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-base font-semibold tracking-tight text-ink">{receiver.participantName}</div>
                          <div className="mt-2 text-sm leading-6 text-muted">
                            {hasInfo ? t("settlement.receiverInfoShared") : t("settlement.receiverInfoNotProvided")}
                          </div>
                        </div>
                        <span className={`tag ${hasInfo ? "bg-sky text-brand" : "bg-slate-100 text-muted"}`}>
                          {hasInfo ? t("settlement.receiverInfoTitle") : t("settlement.receiverInfoOptional")}
                        </span>
                      </div>

                      {hasInfo ? (
                        <div className="mt-5 space-y-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            {receiver.paymentInfo.payeeName ? <InfoCard label={t("settlement.payeeName")} value={receiver.paymentInfo.payeeName} /> : null}
                            {receiver.paymentInfo.paymentMethod ? <InfoCard label={t("settlement.paymentMethod")} value={receiver.paymentInfo.paymentMethod} /> : null}
                            {receiver.paymentInfo.accountName ? <InfoCard label={t("settlement.accountName")} value={receiver.paymentInfo.accountName} /> : null}
                            {receiver.paymentInfo.accountNumber ? <InfoCard label={t("settlement.accountNumber")} value={receiver.paymentInfo.accountNumber} /> : null}
                            {receiver.paymentInfo.notes ? (
                              <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3 md:col-span-2">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.notes")}</div>
                                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{receiver.paymentInfo.notes}</div>
                              </div>
                            ) : null}
                          </div>
                          {receiver.paymentInfo.paymentQrDataUrl ? (
                            <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.paymentQrPreview")}</div>
                              <div className="mt-3 flex justify-center rounded-[18px] bg-white p-3">
                                <img
                                  src={receiver.paymentInfo.paymentQrDataUrl}
                                  alt={t("settlement.paymentQrAlt")}
                                  className="max-h-44 w-auto rounded-[16px] object-contain"
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-muted">
                          {t("settlement.shareReceiverInfoEmpty")}
                        </div>
                      )}
                    </SectionCard>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
    </ModalDialog>
  );
}

function normalizeSavedPaymentProfile(paymentProfile: Partial<SettlementSharePaymentInfo> | null | undefined) {
  return {
    payeeName: paymentProfile?.payeeName?.trim() ?? "",
    paymentMethod: paymentProfile?.paymentMethod?.trim() ?? "",
    accountName: paymentProfile?.accountName?.trim() ?? "",
    accountNumber: paymentProfile?.accountNumber?.trim() ?? "",
    notes: paymentProfile?.notes?.trim() ?? "",
    paymentQrDataUrl: paymentProfile?.paymentQrDataUrl?.trim() ?? ""
  };
}

function matchesParticipantName(participantName: string, userName: string | null | undefined) {
  return participantName.trim().toLocaleLowerCase() === (userName ?? "").trim().toLocaleLowerCase();
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-2 text-base font-semibold text-ink">{value}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-2 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function normalizeDialogDate(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function buildShareUrl(shareToken: string) {
  if (!shareToken) {
    return "";
  }

  const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/+$/, "") : "";
  return origin ? `${origin}/s/${shareToken}` : `/s/${shareToken}`;
}
