import { useState } from "react";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";
import { type SettlementReceiptData, type SettlementReceiptLineTone } from "@/features/settlements/receipt";
import { EmptyState, InlineMessage, LoadingState } from "@/shared/ui/primitives";
import { ChevronDownIcon, ReceiptIcon } from "@/shared/ui/icons";

export function SettlementReceiptBreakdown({
  receipt,
  isLoading,
  error,
  t,
  className = "",
  collapsible = false,
  defaultExpanded = true
}: {
  receipt: SettlementReceiptData;
  isLoading: boolean;
  error: unknown;
  t: (key: any) => string;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const canCollapse = collapsible && !isLoading && !error && receipt.bills.length > 0;
  const body = (
    <>
      <div className="px-4 py-4 md:px-5 md:py-5">
        {isLoading ? (
          <LoadingState lines={3} />
        ) : error ? (
          <InlineMessage tone="error" title={t("feedback.loadFailed")}>
            {getErrorMessage(error)}
          </InlineMessage>
        ) : receipt.bills.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon className="h-6 w-6" />}
            title={t("settlement.shareReceiptEmptyTitle")}
            description={t("settlement.shareReceiptEmptyBody")}
          />
        ) : (
          <div className="space-y-4">
            {receipt.bills.map((bill) => {
              return (
                <article key={bill.id} className="rounded-[24px] border border-slate-200 bg-white/92 p-4 shadow-soft md:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{formatDate(bill.transactionDateUtc)}</div>
                      <h5 className="mt-2 text-lg font-semibold tracking-tight text-ink">{bill.storeName}</h5>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{t("settlement.shareReceiptBillTotal")}</div>
                      <div className="mt-2 text-xl font-semibold tracking-tight text-ink tabular-nums">{formatSignedCurrency(bill.totalAmount)}</div>
                    </div>
                  </div>

                  <div className="my-4 border-t border-dashed border-slate-200/90" />

                  <div className="space-y-2.5">
                    {bill.lines.map((line) => (
                      <ReceiptLine key={line.id} label={line.label} amount={formatSignedCurrency(line.amount)} tone={line.tone} />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {!isLoading && !error && receipt.bills.length > 0 ? (
        <div className="border-t border-dashed border-slate-200/90 bg-slate-50/80 px-5 py-4 md:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("settlement.shareReceiptGrandTotal")}</div>
              <div className="mt-1 text-sm leading-6 text-muted">{t("settlement.shareReceiptGrandTotalBody")}</div>
            </div>
            <div className="text-right text-2xl font-semibold tracking-tight text-ink tabular-nums">{formatCurrency(receipt.grandTotal)}</div>
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <section className={`overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] shadow-soft ${className}`}>
      <div className="border-b border-dashed border-slate-200/90 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_55%)] px-5 py-5 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand shadow-soft">
              <ReceiptIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("settlement.shareBillsCovered")}</div>
              <h4 className="mt-2 text-lg font-semibold tracking-tight text-ink">{t("settlement.shareReceiptTitle")}</h4>
              <p className="mt-2 text-sm leading-6 text-muted">{t("settlement.shareReceiptBody")}</p>
            </div>
          </div>
          {canCollapse ? (
            <button
              aria-label={isExpanded ? "Collapse receipt details" : "Expand receipt details"}
              aria-expanded={isExpanded}
              className="icon-action icon-action-secondary icon-action-sm shrink-0 rounded-full"
              onClick={() => setIsExpanded((current) => !current)}
              type="button"
            >
              <ChevronDownIcon className={`h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isExpanded ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </div>
      </div>

      {!canCollapse ? (
        body
      ) : (
        <div
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
          <div className={`overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isExpanded ? "translate-y-0" : "-translate-y-2"}`}>
            {body}
          </div>
        </div>
      )}
    </section>
  );
}

function ReceiptLine({
  label,
  amount,
  tone = "default"
}: {
  label: string;
  amount: string;
  tone?: SettlementReceiptLineTone;
}) {
  const labelClass = {
    default: "text-sm font-medium text-ink",
    muted: "text-sm text-muted",
    accent: "text-sm font-medium text-success"
  }[tone];

  const amountClass = {
    default: "text-sm font-semibold text-ink",
    muted: "text-sm font-medium text-ink/80",
    accent: "text-sm font-semibold text-success"
  }[tone];

  return (
    <div className="flex items-center justify-between gap-4">
      <div className={`min-w-0 pr-3 ${labelClass}`}>{label}</div>
      <div className={`shrink-0 text-right tabular-nums ${amountClass}`}>{amount}</div>
    </div>
  );
}

function formatSignedCurrency(value: number) {
  return value < 0 ? `- ${formatCurrency(Math.abs(value))}` : formatCurrency(value);
}
