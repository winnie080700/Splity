import { useQuery } from "@tanstack/react-query";
import { apiClient, type GroupStatus } from "@api-client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { ModalDialog } from "@/shared/ui/dialog";
import { useAuth } from "@/shared/auth/AuthProvider";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { CheckIcon, LinkIcon, SparklesIcon, WalletIcon } from "@/shared/ui/icons";
import { InlineMessage, LoadingSpinner, SectionCard } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/toast";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";
import {
  createEmptySharePaymentInfo,
  hasSharePaymentInfo,
  prepareSettlementShareQrDataUrl,
  type SettlementSharePaymentInfo,
  type SettlementShareReceiverPaymentInfo
} from "@/features/settlements/share";

type ShareParticipant = {
  id: string;
  name: string;
  username?: string | null;
};

type ReceiverFormState = SettlementShareReceiverPaymentInfo & {
  wasAutoFilled: boolean;
};

export function SettlementShareDialog({
  open,
  onClose,
  groupId,
  groupName,
  creatorName,
  fromDate,
  toDate,
  hasInvalidDateRange,
  groupStatus,
  participants
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
  participants: ShareParticipant[];
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [receiverInfos, setReceiverInfos] = useState<ReceiverFormState[]>([]);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isConfirmGenerateOpen, setIsConfirmGenerateOpen] = useState(false);
  const [preparingQrParticipantId, setPreparingQrParticipantId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const qrInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const seededStateRef = useRef("");

  const isReadOnly = groupStatus === "settled";
  const canSystemShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const currentFromDateUtc = normalizeDialogDate(fromDate);
  const currentToDateUtc = normalizeDialogDate(toDate);

  const currentShareQuery = useQuery({
    queryKey: ["current-settlement-share", groupId],
    queryFn: () => apiClient.getCurrentSettlementShare(groupId),
    enabled: open && Boolean(groupId),
    retry: false
  });

  const settlementQuery = useQuery({
    queryKey: ["settlement-share-preview", groupId, currentFromDateUtc ?? "", currentToDateUtc ?? ""],
    queryFn: () => apiClient.getSettlements(groupId, {
      fromDate: currentFromDateUtc,
      toDate: currentToDateUtc
    }),
    enabled: open && Boolean(groupId) && !hasInvalidDateRange
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

  useEffect(() => {
    if (!open) {
      setReceiverInfos([]);
      setGeneratedLink("");
      setDialogError(null);
      setIsConfirmGenerateOpen(false);
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
      currentFromDateUtc ?? "",
      currentToDateUtc ?? "",
      receivers.map((receiver) => receiver.participantId).join(","),
      participants.map((participant) => `${participant.id}:${participant.name}:${participant.username ?? ""}`).join(","),
      user?.name ?? "",
      user?.username ?? ""
    ].join("|");

    if (seededStateRef.current === seedKey) {
      return;
    }

    const seededReceivers = receivers.map((receiver) => {
      const existing = currentShareQuery.data?.receiverPaymentInfos.find((entry) => entry.participantId === receiver.participantId) ?? null;
      const participantMeta = participants.find((participant) => participant.id === receiver.participantId);
      const autoFilledPaymentInfo = normalizeSavedPaymentProfile(user?.paymentProfile);
      const shouldAutoFill = !existing && matchesParticipantIdentity(participantMeta, user?.name, user?.username);
      const paymentInfo = existing?.paymentInfo ?? (shouldAutoFill ? autoFilledPaymentInfo : createEmptySharePaymentInfo());

      return {
        participantId: receiver.participantId,
        participantName: receiver.participantName,
        paymentInfo,
        wasAutoFilled: shouldAutoFill && hasSharePaymentInfo(autoFilledPaymentInfo)
      };
    });

    setReceiverInfos(seededReceivers);
    setGeneratedLink(currentShareQuery.data ? buildShareUrl(currentShareQuery.data.shareToken) : "");
    seededStateRef.current = seedKey;
  }, [
    currentFromDateUtc,
    currentShareQuery.data,
    currentToDateUtc,
    open,
    participants,
    receivers,
    settlementQuery.isSuccess,
    user?.name,
    user?.paymentProfile,
    user?.username
  ]);

  const receiverInfoCount = receiverInfos.filter((entry) => hasSharePaymentInfo(entry.paymentInfo)).length;
  const shareGeneratedAtLabel = useMemo(
    () => groupName ? `${groupName} · ${t("settlement.shareAction")}` : t("settlement.shareAction"),
    [groupName, t]
  );
  const hasSavedShare = Boolean(currentShareQuery.data);
  const isBusy = currentShareQuery.isPending || settlementQuery.isPending;
  const hasError = currentShareQuery.isError || settlementQuery.isError;
  const loadError = getErrorMessage(currentShareQuery.error ?? settlementQuery.error);
  const canGenerate = !isReadOnly && !isBusy && !hasError && !hasInvalidDateRange && receivers.length > 0;
  const generateActionLabel = hasSavedShare || generatedLink
    ? t("settlement.shareRegenerateAction")
    : t("settlement.generateLink");

  function updateReceiverField(participantId: string, field: keyof SettlementSharePaymentInfo, value: string) {
    setReceiverInfos((current) => current.map((entry) => (
      entry.participantId === participantId
        ? {
            ...entry,
            wasAutoFilled: false,
            paymentInfo: { ...entry.paymentInfo, [field]: value }
          }
        : entry
    )));

    if (!hasSavedShare) {
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

  async function handleGenerateConfirmed() {
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
        regenerate: hasSavedShare
      });

      setGeneratedLink(buildShareUrl(result.shareToken));
      setIsConfirmGenerateOpen(false);
      seededStateRef.current = "";
      await currentShareQuery.refetch();
      showToast({
        title: hasSavedShare ? t("settlement.shareRegenerated") : t("settlement.shareLinkReady"),
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

  return (
    <>
      <ModalDialog
        open={open}
        onClose={onClose}
        title={t("settlement.shareAction")}
        description={t("settlement.shareDialogBody")}
        className="max-w-5xl"
        actions={(
          <>
            <button className="button-secondary w-full sm:w-auto" onClick={onClose} type="button">
              {t("common.dismiss")}
            </button>
            {!isReadOnly ? (
              <button
                className="button-primary w-full sm:w-auto"
                disabled={!canGenerate}
                onClick={() => setIsConfirmGenerateOpen(true)}
                type="button"
              >
                {isGenerating ? <LoadingSpinner /> : null}
                {generateActionLabel}
              </button>
            ) : null}
          </>
        )}
      >
        <div className="space-y-5">
          <SectionCard className="border border-slate-200/80 bg-slate-50/80 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand shadow-soft">
                  <WalletIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-ink">{t("settlement.receiverInfoStepTitle")}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.receiverInfoStepBody")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="tag bg-white text-brand shadow-soft">{t("settlement.receiverInfoOptional")}</span>
                {hasSavedShare ? <span className="tag bg-slate-100 text-muted">{t("settlement.shareSavedState")}</span> : null}
                {isReadOnly ? <span className="tag bg-slate-100 text-muted">{t("groups.statusSettled")}</span> : null}
              </div>
            </div>
          </SectionCard>

          {hasInvalidDateRange ? (
            <InlineMessage tone="error">{t("settlement.dateRangeInvalid")}</InlineMessage>
          ) : null}

          {hasError ? (
            <InlineMessage tone="error">{loadError}</InlineMessage>
          ) : null}

          {dialogError ? (
            <InlineMessage tone="error">{dialogError}</InlineMessage>
          ) : null}

          {isReadOnly ? (
            <InlineMessage tone="info">{t("settlement.shareReadOnlyBody")}</InlineMessage>
          ) : null}

          {isBusy ? (
            <SectionCard className="flex min-h-[220px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-muted">
                <LoadingSpinner />
                {t("common.loading")}
              </div>
            </SectionCard>
          ) : null}

          {!isBusy && !hasError ? (
            receivers.length === 0 ? (
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
                    paymentInfo: createEmptySharePaymentInfo(),
                    wasAutoFilled: false
                  };
                  const disabled = isReadOnly;
                  const isPreparingQr = preparingQrParticipantId === receiver.participantId;

                  return (
                    <SectionCard key={receiver.participantId} className="border border-slate-200 bg-white/82 p-5">
                      <div className="border-b border-slate-200 pb-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.shareReceiverLabel")}</div>
                            <div className="mt-2 text-xl font-semibold tracking-tight text-ink">{receiver.participantName}</div>
                            <div className="mt-2 text-sm leading-6 text-muted">
                              {t("settlement.shareReceiverAmount")} {formatCurrency(receiver.amount)}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {receiverInfo.wasAutoFilled ? (
                              <span className="tag border border-brand/10 bg-brand/5 text-brand">{t("settlement.autoFilledBadge")}</span>
                            ) : null}
                            <span className="tag bg-slate-100 text-muted">{t("settlement.shareReceiverAmount")} {formatCurrency(receiver.amount)}</span>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted">{t("settlement.shareReceiverInfoHint")}</p>
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
            )
          ) : null}

          {!isBusy && !hasError && generatedLink ? (
            <SectionCard className="border border-slate-200 bg-white/82 p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tag bg-sky text-brand">{t("settlement.generateLinkTitle")}</span>
                    {hasSavedShare ? <span className="tag bg-slate-100 text-muted">{t("settlement.shareSavedState")}</span> : null}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{t("settlement.shareLinkBlockTitle")}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.shareLinkBlockBody")}</p>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <SummaryCard label={t("settlement.shareReceiverCount")} value={String(receivers.length).padStart(2, "0")} />
                  <SummaryCard label={t("settlement.shareReceiverInfoCount")} value={String(receiverInfoCount).padStart(2, "0")} />
                </div>
              </div>

              {currentShareQuery.data?.createdAtUtc ? (
                <div className="mt-4 text-sm text-muted">
                  {t("settlement.shareCreatedAt")} {formatDate(currentShareQuery.data.createdAtUtc)}
                </div>
              ) : null}

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] p-4 shadow-soft">
                <div className="break-all text-sm leading-6 text-ink">{generatedLink}</div>
              </div>

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
              </div>
            </SectionCard>
          ) : null}
        </div>
      </ModalDialog>

      <ConfirmDialog
        open={isConfirmGenerateOpen}
        title={t("settlement.generateConfirmTitle")}
        description={t("settlement.generateConfirmBody")}
        details={groupName ?? ""}
        cancelLabel={t("common.cancel")}
        confirmLabel={generateActionLabel}
        error={dialogError}
        isBusy={isGenerating}
        tone="default"
        onClose={() => {
          if (!isGenerating) {
            setIsConfirmGenerateOpen(false);
            setDialogError(null);
          }
        }}
        onConfirm={() => void handleGenerateConfirmed()}
      />
    </>
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

function matchesParticipantIdentity(
  participant: ShareParticipant | undefined,
  userName: string | null | undefined,
  username: string | null | undefined
) {
  if (!participant) {
    return false;
  }

  const normalizedParticipantName = participant.name.trim().toLocaleLowerCase();
  const normalizedParticipantUsername = (participant.username ?? "").trim().toLocaleLowerCase();
  const normalizedUserName = (userName ?? "").trim().toLocaleLowerCase();
  const normalizedUsername = (username ?? "").trim().toLocaleLowerCase();

  return (
    (normalizedParticipantName !== "" && normalizedParticipantName === normalizedUserName) ||
    (normalizedParticipantUsername !== "" && normalizedParticipantUsername === normalizedUsername)
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-2 text-base font-semibold text-ink">{value}</div>
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
