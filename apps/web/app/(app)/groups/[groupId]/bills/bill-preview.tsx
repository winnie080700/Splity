"use client";

import { SPLIT_MODE } from "@/lib/calculations/types";
import { useTranslation } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n/messages/en";
import type { BillDetail } from "@/lib/calculations/bill-read-projection";
import type { Participant } from "@/lib/services/participants";

export type BillPreviewData = Pick<
  BillDetail,
  | "storeName"
  | "transactionDateUtc"
  | "currencyCode"
  | "splitMode"
  | "primaryPayerParticipantId"
  | "subtotalAmount"
  | "totalFeeAmount"
  | "grandTotalAmount"
  | "appliedFees"
  | "items"
>;

type BillPreviewProps = {
  bill: BillPreviewData;
  hideHeader?: boolean;
  participants: Pick<Participant, "id" | "name">[];
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

function currencyLabel(currencyCode: string) {
  return currencyCode === "MYR" ? "RM" : currencyCode;
}

function money(amount: string, currencyCode: string) {
  return `${currencyLabel(currencyCode)} ${Number(amount || 0).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function interpolate(message: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    message
  );
}

export function BillPreview({ bill, hideHeader, participants }: BillPreviewProps) {
  const { t } = useTranslation();
  const tx = (key: MessageKey, values: Record<string, string | number>) =>
    interpolate(t(key), values);
  const participantById = new Map(
    participants.map((participant) => [participant.id, participant])
  );
  const primaryPayer = participantById.get(bill.primaryPayerParticipantId);
  const splitModeLabel =
    bill.splitMode === SPLIT_MODE.weighted
      ? t("groupDetail.splitUneven")
      : t("groupDetail.splitEqual");

  return (
    <div className="rounded-[24px] border border-[var(--splity-line)] bg-white p-5 shadow-[0_18px_50px_rgba(12,21,56,0.08)]">
      {hideHeader ? null : (
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
            {t("bills.billDetails")}
          </p>
          <h2 className="splity-display mt-1 text-2xl font-extrabold text-[var(--splity-ink)]">
            {bill.storeName || t("bills.storeName")}
          </h2>
        </div>
      )}

      <div className={[hideHeader ? "" : "mt-5", "grid overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white sm:grid-cols-2"].join(" ")}>
        <MetaCell label={t("groupDetail.store")} value={bill.storeName || t("bills.storeName")} />
        <MetaCell label={t("groupDetail.date")} value={formatDate(bill.transactionDateUtc)} />
        <MetaCell
          label={t("bills.primaryPayer")}
          value={
            <span className="inline-flex items-center gap-2">
              <ParticipantDot name={primaryPayer?.name ?? t("bills.unknown")} />
              {primaryPayer?.name ?? t("bills.unknown")}
            </span>
          }
        />
        <MetaCell label={t("bills.splitMode")} value={<span className="text-purple-700">{splitModeLabel}</span>} />
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-[var(--splity-line)]">
        <div className="flex items-center justify-between bg-[var(--splity-bg)]/45 px-4 py-3">
          <h3 className="text-sm font-extrabold text-[var(--splity-ink)]">
            {t("bills.items")}
          </h3>
          <span className="text-[11px] font-bold text-[var(--splity-muted)]">
            {tx("bills.itemCount", { count: bill.items.length })}
          </span>
        </div>
        <div className="divide-y divide-[var(--splity-line)] bg-white">
          {bill.items.map((item, index) => {
            const count = item.responsibleParticipantIds.length;
            const percent = count ? Math.round(100 / count) : 0;
            const summaryKey =
              count === 1
                ? "bills.itemResponsibilityOne"
                : "bills.itemResponsibilityMany";

            return (
              <div
                className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-start"
                key={item.id ?? `${item.description}-${index}`}
              >
                <div className="min-w-0">
                  <p className="font-bold text-[var(--splity-ink)]">
                    {item.description || t("bills.description")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.responsibleParticipantIds.map((participantId) => {
                      const participant = participantById.get(participantId);
                      const name = participant?.name ?? t("bills.unknown");
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--splity-bg)] px-2 py-1 text-[10px] font-bold text-[var(--splity-ink)]"
                          key={participantId}
                        >
                          <ParticipantDot name={name} small />
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-extrabold text-[var(--splity-navy)]">
                    {money(item.amount, bill.currencyCode)}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--splity-muted)]">
                    {tx(summaryKey, { count, percent })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-[var(--splity-line)]">
        <div className="flex items-center justify-between bg-[var(--splity-bg)]/45 px-4 py-3">
          <h3 className="text-sm font-extrabold text-[var(--splity-ink)]">
            {t("bills.feesService")}
          </h3>
          <span className="text-[11px] font-bold text-[var(--splity-muted)]">
            {bill.appliedFees.length ? bill.appliedFees.length : t("bills.none")}
          </span>
        </div>
        <div className="bg-white px-4 py-4">
          {bill.appliedFees.length ? (
            <div className="grid gap-2">
              {bill.appliedFees.map((fee) => (
                <div className="flex items-center justify-between gap-3 text-sm" key={fee.name}>
                  <span className="font-semibold text-[var(--splity-ink)]">{fee.name}</span>
                  <span className="font-mono font-bold text-[var(--splity-navy)]">
                    {money(fee.appliedAmount, bill.currencyCode)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--splity-muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--splity-mint)]" />
              {t("bills.noFeesApplied")}
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/35 p-4">
        <TotalRow label={t("bills.subtotal")} value={money(bill.subtotalAmount, bill.currencyCode)} />
        <TotalRow label={t("bills.fees")} value={money(bill.totalFeeAmount, bill.currencyCode)} />
        <div className="mt-3 border-t-2 border-[var(--splity-navy)] pt-4">
          <div className="flex items-end justify-between gap-3">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--splity-ink)]">
              {t("bills.total")}
            </span>
            <span className="splity-display text-3xl font-extrabold text-[var(--splity-navy)]">
              {money(bill.grandTotalAmount, bill.currencyCode)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetaCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-r border-[var(--splity-line)] p-4 last:border-r-0 sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
        {label}
      </p>
      <div className="mt-2 text-sm font-extrabold text-[var(--splity-ink)]">
        {value}
      </div>
    </div>
  );
}

function ParticipantDot({
  name,
  small,
}: {
  name: string;
  small?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#c46920] splity-display font-extrabold text-white",
        small ? "h-4 w-4 text-[8px]" : "h-6 w-6 text-[10px]",
      ].join(" ")}
    >
      {initials(name)}
    </span>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
      <span className="font-bold text-[var(--splity-muted)]">{label}</span>
      <span className="font-mono font-extrabold text-[var(--splity-navy)]">
        {value}
      </span>
    </div>
  );
}
