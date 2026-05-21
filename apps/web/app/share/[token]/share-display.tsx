"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { SETTLEMENT_TRANSFER_STATUS_LABELS } from "@/lib/domain/status";
import type { PublicSettlementShare } from "@/lib/services/settlement-shares";

type ShareDisplayProps = {
  share: PublicSettlementShare;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Any time";
}

function statusTone(status: number) {
  if (status === 2) return "green";
  if (status === 1) return "amber";
  return "neutral";
}

export function ShareDisplay({ share }: ShareDisplayProps) {
  const [qrExpanded, setQrExpanded] = useState(false);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Pay to</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Generated {new Date(share.created_at_utc).toLocaleString()}
          </p>
        </div>
        <div className="grid gap-1">
          <div className="text-xl font-semibold text-zinc-950">{share.payee_name ?? share.creator_name ?? "Payee"}</div>
          <div className="text-sm text-zinc-600">
            {[share.payment_method, share.account_number].filter(Boolean).join(" · ") || "Payment details unavailable"}
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
              alt="Payment QR"
              className={qrExpanded ? "h-auto max-h-[70vh] w-full max-w-md" : "h-32 w-32 object-contain"}
              src={share.payment_qr_data_url}
            />
          </button>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Transfers</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Period: {formatDate(share.from_date_utc)} to {formatDate(share.to_date_utc)}
          </p>
        </div>
        {share.transfers.length ? (
          <div className="divide-y divide-zinc-100">
            {share.transfers.map((transfer, index) => (
              <div className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={`${transfer.from_name}-${transfer.to_name}-${index}`}>
                <div className="font-medium text-zinc-950">
                  {transfer.from_name} pays {transfer.to_name}
                </div>
                <div className="font-semibold text-zinc-950">MYR {Number(transfer.amount).toFixed(2)}</div>
                <Badge tone={statusTone(transfer.status)}>
                  {SETTLEMENT_TRANSFER_STATUS_LABELS[transfer.status as 0 | 1 | 2] ?? "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No transfers are needed for this settlement.
          </div>
        )}
      </section>
    </div>
  );
}
