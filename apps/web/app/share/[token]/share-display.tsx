"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import type { PublicSettlementShare } from "@/lib/services/settlement-shares";

type ShareDisplayProps = {
  share: PublicSettlementShare;
};

type ReceiverPaymentInfo = {
  accountName?: string | null;
  accountNumber?: string | null;
  notes?: string | null;
  participantId?: string | null;
  paymentMethod?: string | null;
  paymentQrDataUrl?: string | null;
  receiverName?: string | null;
};

function formatDate(value: string | null, fallback: string) {
  return value ? new Date(value).toLocaleDateString() : fallback;
}

function statusTone(status: number) {
  if (status === 2) return "green";
  if (status === 1) return "amber";
  return "neutral";
}

function parseReceiverPaymentInfos(value: string | null): ReceiverPaymentInfo[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasPaymentInfo(info: ReceiverPaymentInfo | null | undefined) {
  return Boolean(
    info?.receiverName ||
      info?.paymentMethod ||
      info?.accountName ||
      info?.accountNumber ||
      info?.notes ||
      info?.paymentQrDataUrl
  );
}

export function ShareDisplay({ share }: ShareDisplayProps) {
  const [qrExpanded, setQrExpanded] = useState(false);
  const { t } = useTranslation();
  const receiverPaymentInfos = parseReceiverPaymentInfos(share.receiver_payment_infos_json);
  const receiverPaymentInfoByParticipantId = new Map(
    receiverPaymentInfos
      .filter((info) => info.participantId)
      .map((info) => [String(info.participantId), info])
  );
  const firstReceiverPaymentInfo = receiverPaymentInfos.find(hasPaymentInfo);
  const legacyPaymentInfo: ReceiverPaymentInfo = {
    accountName: share.account_name,
    accountNumber: share.account_number,
    notes: share.notes,
    paymentMethod: share.payment_method,
    paymentQrDataUrl: share.payment_qr_data_url,
    receiverName: share.payee_name ?? share.creator_name,
  };
  const primaryPaymentInfo = firstReceiverPaymentInfo ?? legacyPaymentInfo;

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">{t("share.payTo")}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {t("share.generated").replace("{date}", new Date(share.created_at_utc).toLocaleString())}
          </p>
        </div>
        <div className="grid gap-1">
          <div className="text-xl font-semibold text-zinc-950">{primaryPaymentInfo.receiverName ?? t("share.payee")}</div>
          <div className="text-sm text-zinc-600">
            {[primaryPaymentInfo.paymentMethod, primaryPaymentInfo.accountNumber].filter(Boolean).join(" · ") || t("share.paymentUnavailable")}
          </div>
          {primaryPaymentInfo.accountName ? <div className="text-sm text-zinc-600">{primaryPaymentInfo.accountName}</div> : null}
          {primaryPaymentInfo.notes ? <div className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{primaryPaymentInfo.notes}</div> : null}
        </div>
        {primaryPaymentInfo.paymentQrDataUrl ? (
          <button
            className="w-fit rounded-md border border-zinc-200 bg-white p-2 text-left shadow-sm"
            onClick={() => setQrExpanded((value) => !value)}
            type="button"
          >
            <img
              alt={t("share.paymentQrAlt")}
              className={qrExpanded ? "h-auto max-h-[70vh] w-full max-w-md" : "h-32 w-32 object-contain"}
              src={primaryPaymentInfo.paymentQrDataUrl}
            />
          </button>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">{t("share.transfers")}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {t("share.period")
              .replace("{from}", formatDate(share.from_date_utc, t("share.anyTime")))
              .replace("{to}", formatDate(share.to_date_utc, t("share.anyTime")))}
          </p>
        </div>
        {share.transfers.length ? (
          <div className="divide-y divide-zinc-100">
            {share.transfers.map((transfer, index) => {
              const receiverInfo =
                (transfer.to_participant_id
                  ? receiverPaymentInfoByParticipantId.get(transfer.to_participant_id)
                  : null) ?? legacyPaymentInfo;

              return (
                <div className="grid gap-3 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-start" key={`${transfer.from_name}-${transfer.to_name}-${index}`}>
                  <div className="grid gap-2">
                    <div className="font-medium text-zinc-950">
                      {t("share.pays").replace("{from}", transfer.from_name).replace("{to}", transfer.to_name)}
                    </div>
                    {hasPaymentInfo(receiverInfo) ? (
                      <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                        <div className="font-semibold text-zinc-950">{receiverInfo.receiverName ?? transfer.to_name}</div>
                        <div>
                          {[receiverInfo.paymentMethod, receiverInfo.accountNumber].filter(Boolean).join(" · ") || t("share.paymentUnavailable")}
                        </div>
                        {receiverInfo.accountName ? <div>{receiverInfo.accountName}</div> : null}
                        {receiverInfo.notes ? <div className="mt-1">{receiverInfo.notes}</div> : null}
                        {receiverInfo.paymentQrDataUrl ? (
                          <img
                            alt={t("share.paymentQrAlt")}
                            className="mt-2 h-20 w-20 rounded-md border border-zinc-200 bg-white object-contain p-1"
                            src={receiverInfo.paymentQrDataUrl}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="font-semibold text-zinc-950">MYR {Number(transfer.amount).toFixed(2)}</div>
                  <Badge tone={statusTone(transfer.status)}>
                    {transfer.status === 2
                      ? t("settlements.status.received")
                      : transfer.status === 1
                        ? t("settlements.status.markedPaid")
                        : t("settlements.status.pending")}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            {t("share.noSettlementTransfers")}
          </div>
        )}
      </section>
    </div>
  );
}
