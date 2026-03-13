import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatCurrency, getErrorMessage } from "@/shared/utils/format";
import { EmptyState, InlineMessage, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { ArrowsIcon, CalendarIcon, SparklesIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";

export function SettlementsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { t } = useI18n();

  const hasInvalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);

  const settlementQuery = useQuery({
    queryKey: ["settlements", groupId, fromDate, toDate],
    queryFn: () => apiClient.getSettlements(groupId!, {
      fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDate: toDate ? new Date(toDate).toISOString() : undefined
    }),
    enabled: Boolean(groupId) && !hasInvalidDateRange
  });

  const nameById = Object.fromEntries((settlementQuery.data?.netBalances ?? []).map((x) => [x.participantId, x.participantName]));
  const balances = settlementQuery.data?.netBalances ?? [];
  const transfers = settlementQuery.data?.transfers ?? [];
  const creditors = balances.filter((balance) => balance.netAmount > 0).length;
  const debtors = balances.filter((balance) => balance.netAmount < 0).length;

  return (
    <div className="space-y-6">
      <SectionCard className="p-6">
        <PageHeading
          eyebrow={t("nav.settlement")}
          title={t("settlement.transferPlan")}
          description={t("settlement.subtitle")}
        />

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr,0.8fr,0.8fr,0.8fr]">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarIcon className="h-4 w-4 text-brand" />
              {t("settlement.filters")}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate">{t("settlement.filtersHint")}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                className={[
                  "input-base",
                  hasInvalidDateRange ? "border-danger focus:border-danger focus:ring-danger/10" : ""
                ].join(" ")}
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <input
                className={[
                  "input-base",
                  hasInvalidDateRange ? "border-danger focus:border-danger focus:ring-danger/10" : ""
                ].join(" ")}
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            {hasInvalidDateRange ? (
              <p className="mt-3 text-sm font-medium text-danger">{t("settlement.dateRangeInvalid")}</p>
            ) : null}
          </div>

          <StatTile
            label={t("settlement.creditors")}
            value={String(creditors).padStart(2, "0")}
            icon={<WalletIcon className="h-5 w-5" />}
            tone="success"
          />
          <StatTile
            label={t("settlement.debtors")}
            value={String(debtors).padStart(2, "0")}
            icon={<UsersIcon className="h-5 w-5" />}
            tone="warning"
          />
          <StatTile
            label={t("settlement.transfersCount")}
            value={String(transfers.length).padStart(2, "0")}
            icon={<ArrowsIcon className="h-5 w-5" />}
            tone="brand"
          />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <SectionCard className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title">{t("settlement.netBalances")}</h2>
              <p className="mt-2 section-copy">{t("settlement.subtitle")}</p>
            </div>
            <span className="tag bg-sky text-brand">{balances.length} {t("settlement.netBalances")}</span>
          </div>

          <div className="mt-5 space-y-3">
            {hasInvalidDateRange ? (
              <InlineMessage tone="error">{t("settlement.dateRangeInvalid")}</InlineMessage>
            ) : settlementQuery.isError ? (
              <InlineMessage
                tone="error"
                title={t("feedback.loadFailed")}
                action={(
                  <button className="button-secondary" onClick={() => settlementQuery.refetch()} type="button">
                    {t("common.retry")}
                  </button>
                )}
              >
                {getErrorMessage(settlementQuery.error)}
              </InlineMessage>
            ) : settlementQuery.isPending ? (
              <LoadingState lines={4} />
            ) : balances.length === 0 ? (
              <EmptyState
                icon={<SparklesIcon className="h-6 w-6" />}
                title={t("settlement.noBalancesTitle")}
                description={t("settlement.noBalancesBody")}
                action={groupId ? (
                  <Link className="button-secondary" to={`/groups/${groupId}/bills`}>
                    {t("common.goToBills")}
                  </Link>
                ) : undefined}
              />
            ) : (
              balances.map((balance) => {
                const isPositive = balance.netAmount >= 0;

                return (
                  <article
                    key={balance.participantId}
                    className={[
                      "list-card",
                      isPositive ? "border-mint/80 bg-mint/30" : "border-amber/80 bg-amber/40"
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-base font-semibold tracking-tight text-ink">{balance.participantName}</div>
                        <div className="mt-1 text-sm text-slate">
                          {isPositive ? t("settlement.creditors") : t("settlement.debtors")}
                        </div>
                      </div>
                      <div className={`text-right text-xl font-semibold tracking-tight ${isPositive ? "text-success" : "text-danger"}`}>
                        {formatCurrency(balance.netAmount)}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title">{t("settlement.transferPlan")}</h2>
              <p className="mt-2 section-copy">{t("settlement.subtitle")}</p>
            </div>
            <span className="tag bg-mint text-success">{transfers.length} {t("nav.settlement")}</span>
          </div>

          <div className="mt-5 space-y-3">
            {hasInvalidDateRange ? (
              <InlineMessage tone="error">{t("settlement.dateRangeInvalid")}</InlineMessage>
            ) : settlementQuery.isError ? (
              <InlineMessage
                tone="error"
                title={t("feedback.loadFailed")}
                action={(
                  <button className="button-secondary" onClick={() => settlementQuery.refetch()} type="button">
                    {t("common.retry")}
                  </button>
                )}
              >
                {getErrorMessage(settlementQuery.error)}
              </InlineMessage>
            ) : settlementQuery.isPending ? (
              <LoadingState lines={3} />
            ) : transfers.length === 0 ? (
              <EmptyState
                icon={<ArrowsIcon className="h-6 w-6" />}
                title={t("settlement.empty")}
                description={balances.length === 0 ? t("settlement.noBalancesBody") : t("settlement.subtitle")}
                action={groupId && balances.length === 0 ? (
                  <Link className="button-secondary" to={`/groups/${groupId}/bills`}>
                    {t("common.goToBills")}
                  </Link>
                ) : undefined}
              />
            ) : (
              transfers.map((transfer, index) => (
                <article key={`${transfer.fromParticipantId}-${transfer.toParticipantId}-${index}`} className="list-card">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="tag bg-amber text-ink">{nameById[transfer.fromParticipantId] ?? transfer.fromParticipantId.slice(0, 8)}</span>
                      <span className="text-slate">{t("settlement.pays")}</span>
                      <span className="tag bg-sky text-brand">{nameById[transfer.toParticipantId] ?? transfer.toParticipantId.slice(0, 8)}</span>
                    </div>
                    <div className="text-xl font-semibold tracking-tight text-ink">{formatCurrency(transfer.amount)}</div>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
