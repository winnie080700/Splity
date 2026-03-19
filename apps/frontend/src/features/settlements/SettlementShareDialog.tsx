import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { apiClient } from "@api-client";
import { InlineMessage, LoadingSpinner, SectionCard } from "@/shared/ui/primitives";
import { CheckIcon, LinkIcon, SparklesIcon, WalletIcon } from "@/shared/ui/icons";
import { ModalDialog } from "@/shared/ui/dialog";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useToast } from "@/shared/ui/toast";
import {
  createEmptySharePaymentInfo,
  hasSharePaymentInfo,
  prepareSettlementShareQrDataUrl,
  type SettlementSharePaymentInfo
} from "@/features/settlements/share";

export function SettlementShareDialog({
  open,
  onClose,
  groupId,
  groupName,
  creatorName,
  fromDate,
  toDate,
  hasInvalidDateRange
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName?: string;
  creatorName?: string;
  fromDate: string;
  toDate: string;
  hasInvalidDateRange: boolean;
}) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [paymentInfo, setPaymentInfo] = useState<SettlementSharePaymentInfo>(createEmptySharePaymentInfo);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreparingQr, setIsPreparingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const infoProvided = hasSharePaymentInfo(paymentInfo);
  const canSystemShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const generatedAtLabel = useMemo(() => groupName ? `${groupName} · ${t("settlement.shareAction")}` : t("settlement.shareAction"), [groupName, t]);

  function updateField(field: keyof SettlementSharePaymentInfo, value: string) {
    setPaymentInfo((current) => ({ ...current, [field]: value }));
    if (generatedLink) {
      setGeneratedLink("");
    }
  }

  async function handleQrSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsPreparingQr(true);
      const dataUrl = await prepareSettlementShareQrDataUrl(file);
      updateField("paymentQrDataUrl", dataUrl);
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
      setIsPreparingQr(false);
      event.target.value = "";
    }
  }

  async function handleGenerateLink() {
    try {
      setIsGenerating(true);
      const result = await apiClient.createSettlementShare(groupId, {
        fromDateUtc: fromDate ? new Date(fromDate).toISOString() : undefined,
        toDateUtc: toDate ? new Date(toDate).toISOString() : undefined,
        creatorName: creatorName?.trim() || undefined,
        paymentInfo: infoProvided ? paymentInfo : undefined
      });

      const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/+$/, "") : "";
      setGeneratedLink(origin ? `${origin}/s/${result.shareToken}` : `/s/${result.shareToken}`);
      showToast({
        title: t("settlement.shareLinkReady"),
        description: infoProvided ? t("settlement.shareWithPaymentInfo") : t("settlement.shareWithoutPaymentInfo"),
        tone: "success"
      });
    }
    catch (error) {
      showToast({ title: t("feedback.requestFailed"), description: error instanceof Error ? error.message : t("feedback.requestFailed"), tone: "error" });
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
        title: generatedAtLabel,
        text: t("settlement.shareHint"),
        url: generatedLink
      });
    }
    catch {
      // Ignore cancel, only toast if there is a real failure path later.
    }
    finally {
      setIsSharing(false);
    }
  }

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title={t("settlement.shareAction")}
      description={t("settlement.shareDialogBody")}
      actions={
        <>
          <button className="button-secondary" onClick={onClose} type="button">
            {t("common.dismiss")}
          </button>
          <button className="button-primary" disabled={hasInvalidDateRange || isGenerating} onClick={handleGenerateLink} type="button">
            {isGenerating ? <LoadingSpinner /> : null}
            {t("settlement.generateLink")}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <SectionCard className="overflow-hidden border border-brand/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.06),rgba(255,255,255,0.98))] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tag bg-white text-brand shadow-soft">{t("settlement.receiverInfoOptional")}</span>
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">{groupName ?? t("settlement.shareAction")}</span>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand shadow-soft">
              <WalletIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-ink">{t("settlement.receiverInfoTitle")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.receiverInfoBody")}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">{t("settlement.payeeName")}</span>
              <input className="input-base" value={paymentInfo.payeeName} onChange={(event) => updateField("payeeName", event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">{t("settlement.paymentMethod")}</span>
              <input className="input-base" value={paymentInfo.paymentMethod} onChange={(event) => updateField("paymentMethod", event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">{t("settlement.accountName")}</span>
              <input className="input-base" value={paymentInfo.accountName} onChange={(event) => updateField("accountName", event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">{t("settlement.accountNumber")}</span>
              <input className="input-base" value={paymentInfo.accountNumber} onChange={(event) => updateField("accountNumber", event.target.value)} />
            </label>
          </div>

          <label className="mt-3 block space-y-2">
            <span className="text-sm font-medium text-muted">{t("settlement.notes")}</span>
            <textarea className="input-base min-h-[96px] resize-y py-3" value={paymentInfo.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </label>

          <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-white/88 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-ink">{t("settlement.paymentQrLabel")}</div>
                <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.paymentQrBody")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={qrInputRef}
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={handleQrSelected}
                />
                <button className="button-secondary" disabled={isPreparingQr} onClick={() => qrInputRef.current?.click()} type="button">
                  {isPreparingQr ? <LoadingSpinner /> : null}
                  {paymentInfo.paymentQrDataUrl ? t("settlement.paymentQrReplace") : t("settlement.paymentQrUpload")}
                </button>
                {paymentInfo.paymentQrDataUrl ? (
                  <button className="button-pill" onClick={() => updateField("paymentQrDataUrl", "")} type="button">
                    {t("settlement.paymentQrRemove")}
                  </button>
                ) : null}
              </div>
            </div>

            {paymentInfo.paymentQrDataUrl ? (
              <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.paymentQrPreview")}</div>
                <div className="mt-3 flex justify-center rounded-[18px] bg-white p-3">
                  <img
                    src={paymentInfo.paymentQrDataUrl}
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

        <SectionCard className="border border-slate-200/80 bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky text-brand shadow-soft">
              <SparklesIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-ink">{t("settlement.generateLinkTitle")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {infoProvided ? t("settlement.shareWithPaymentInfo") : t("settlement.shareWithoutPaymentInfo")}
              </p>
            </div>
          </div>

          {hasInvalidDateRange ? (
            <div className="mt-4">
              <InlineMessage tone="error">{t("settlement.dateRangeInvalid")}</InlineMessage>
            </div>
          ) : null}

          {generatedLink ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("settlement.shareLinkBlockTitle")}</div>
                <div className="mt-2 text-sm leading-6 text-muted">{t("settlement.shareLinkBlockBody")}</div>
                <div className="mt-3 break-all text-sm leading-6 text-ink">{generatedLink}</div>
              </div>
              <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm leading-6 text-muted">
                {t("settlement.shareCopyHelp")}
              </div>
              <div className="flex flex-wrap gap-3">
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
            </div>
          ) : (
            <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm leading-6 text-muted">
              {t("settlement.generateHint")}
            </div>
          )}
        </SectionCard>
      </div>
    </ModalDialog>
  );
}
