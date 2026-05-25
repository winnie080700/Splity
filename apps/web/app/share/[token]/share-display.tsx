"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import type { PublicSettlementShare } from "@/lib/services/settlement-shares";

type ShareDisplayProps = {
  share: PublicSettlementShare;
};

function formatDate(value: string | null, fallback: string) {
  return value ? new Date(value).toLocaleDateString() : fallback;
}

function statusTone(status: number) {
  if (status === 2) return "green";
  if (status === 1) return "amber";
  return "neutral";
}

export function ShareDisplay({ share }: ShareDisplayProps) {
  const [qrExpanded, setQrExpanded] = useState(false);
  const { t } = useTranslation();

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
          <div className="text-xl font-semibold text-zinc-950">{share.payee_name ?? share.creator_name ?? t("share.payee")}</div>
          <div className="text-sm text-zinc-600">
            {[share.payment_method, share.account_number].filter(Boolean).join(" · ") || t("share.paymentUnavailable")}
          </div>
          {share.account_name ? <div className="text-sm text-zinc-600">{share.account_name}</div> : null}
          {share.notes ? <div className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{share.notes}</div> : null}
        </div>
        {share.payment_qr_data_url ? (
          <button
            className="w-fit rounded-md border border-zinc-200 bg-white p-2 text-left shadow-sm"
            onClick={() => setQrExpanded((value) => !value)}
            type="button"
          >
            <img
              alt={t("share.paymentQrAlt")}
              className={qrExpanded ? "h-auto max-h-[70vh] w-full max-w-md" : "h-32 w-32 object-contain"}
              src={share.payment_qr_data_url}
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
            {share.transfers.map((transfer, index) => (
              <div className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={`${transfer.from_name}-${transfer.to_name}-${index}`}>
                <div className="font-medium text-zinc-950">
                  {t("share.pays").replace("{from}", transfer.from_name).replace("{to}", transfer.to_name)}
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
            ))}
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
