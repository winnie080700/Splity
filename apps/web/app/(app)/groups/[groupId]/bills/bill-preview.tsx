"use client";

import { CalendarDays, Edit3, ReceiptText, ShieldCheck, Store, User, Workflow } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
  editHref?: string;
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

export function BillPreview({ bill, editHref, hideHeader, participants }: BillPreviewProps) {
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
  const feeAmount = bill.appliedFees.reduce((sum, fee) => sum + Math.max(0, Number(fee.appliedAmount)), 0);
  const discountAmount = bill.appliedFees.reduce((sum, fee) => sum + Math.min(0, Number(fee.appliedAmount)), 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
      {hideHeader ? null : (
        <div className="lg:col-span-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
            {t("bills.billDetails")}
          </p>
          <h2 className="splity-display mt-1 text-2xl font-extrabold text-[var(--splity-ink)]">
            {bill.storeName || t("bills.storeName")}
          </h2>
        </div>
      )}

      <section className="min-h-[360px] rounded-2xl border border-[var(--splity-line)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-extrabold text-[var(--splity-ink)]">
              {t("bills.items")}
            </h3>
            <span className="rounded-full bg-[var(--splity-bg)] px-3 py-1 text-xs font-bold text-[var(--splity-muted)]">
            {tx("bills.itemCount", { count: bill.items.length })}
            </span>
          </div>
          {editHref ? (
            <Link className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-teal-700" href={editHref}>
              <Edit3 className="h-4 w-4" />
              {t("bills.editBill")}
            </Link>
          ) : null}
        </div>
        <div className="mt-5 hidden grid-cols-[minmax(0,1fr)_minmax(170px,0.75fr)_auto] gap-4 px-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--splity-muted)] sm:grid">
          <span>{t("bills.description")}</span>
          <span>{t("bills.responsibleParticipants")}</span>
          <span className="text-right">{t("groupDetail.amount")}</span>
        </div>
        <div className="mt-2 grid gap-3">
          {bill.items.map((item, index) => {
            return (
              <div
                className="grid gap-3 rounded-xl border border-[var(--splity-line)] bg-white px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(170px,0.75fr)_auto] sm:items-center sm:gap-4"
                key={item.id ?? `${item.description}-${index}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-teal-200 bg-teal-50 text-xs font-extrabold text-teal-700">
                    {index + 1}
                  </span>
                  <p className="text-base font-extrabold text-[var(--splity-ink)]">
                    {item.description || t("bills.description")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.responsibleParticipantIds.length
                    ? item.responsibleParticipantIds.map((participantId) => {
                        const participant = participantById.get(participantId);
                        const name = participant?.name ?? t("bills.unknown");
                        return (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--splity-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--splity-ink)]"
                            key={participantId}
                          >
                            <ParticipantDot name={name} small />
                            {name}
                          </span>
                        );
                      })
                    : <span className="text-xs font-semibold text-[var(--splity-muted)]">{t("bills.none")}</span>}
                </div>
                <p className="font-mono text-base font-extrabold text-teal-700 sm:text-right">
                  {money(item.amount, bill.currencyCode)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="grid content-start gap-5">
        <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <ReceiptText className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-extrabold text-[var(--splity-ink)]">{t("bills.billDetails")}</h3>
          </div>
          <div className="mt-6 divide-y divide-[var(--splity-line)]">
            <DetailRow icon={<Store className="h-4 w-4" />} label={t("groupDetail.store")} value={bill.storeName || t("bills.storeName")} />
            <DetailRow icon={<CalendarDays className="h-4 w-4" />} label={t("groupDetail.date")} value={formatDate(bill.transactionDateUtc)} />
            <DetailRow
              icon={<User className="h-4 w-4" />}
              label={t("bills.primaryPayer")}
              value={
                <span className="inline-flex items-center gap-2">
                  <ParticipantDot name={primaryPayer?.name ?? t("bills.unknown")} />
                  {primaryPayer?.name ?? t("bills.unknown")}
                </span>
              }
            />
            <DetailRow icon={<Workflow className="h-4 w-4" />} label={t("bills.splitMode")} value={<span className="text-purple-700">{splitModeLabel}</span>} />
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <ReceiptText className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-extrabold text-[var(--splity-ink)]">{t("bills.billSummary")}</h3>
          </div>
          <div className="mt-6">
            <TotalRow label={t("bills.subtotal")} value={money(bill.subtotalAmount, bill.currencyCode)} />
            <TotalRow label={t("bills.fees")} value={money(String(feeAmount), bill.currencyCode)} />
            <TotalRow label={t("bills.discounts")} value={`- ${money(String(Math.abs(discountAmount)), bill.currencyCode)}`} />
            <div className="mt-4 border-t-2 border-[var(--splity-navy)] pt-4">
              <div className="flex items-end justify-between gap-3">
                <span className="text-sm font-extrabold text-[var(--splity-ink)]">
                  {t("bills.total")}
                </span>
                <span className="splity-display text-3xl font-extrabold text-teal-700">
                  {money(bill.grandTotalAmount, bill.currencyCode)}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-[var(--splity-muted)]">{t("bills.summaryFootnote")}</p>
            </div>
          </div>
        </section>

        <section className="flex items-start gap-4 rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="font-extrabold text-teal-800">{t("bills.includedInGroupTotal")}</p>
            <p className="mt-1 text-sm font-semibold text-teal-800/80">{t("bills.changesUpdateSettlement")}</p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-4">
      <span className="text-[var(--splity-muted)]">{icon}</span>
      <p className="font-bold text-[var(--splity-muted)]">{label}</p>
      <div className="text-right font-extrabold text-[var(--splity-ink)]">
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
