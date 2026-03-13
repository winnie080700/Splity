import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient, type BillDetailDto, type BillSummaryDto } from "@api-client";
import { saveGroup, readSavedGroups } from "@/shared/utils/storage";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";
import { EmptyState, InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { ArrowsIcon, PlusIcon, ReceiptIcon, SparklesIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";

function getPrimaryPayerName(detail: BillDetailDto) {
  const directContribution = detail.contributions.find(
    (contribution) => contribution.participantId === detail.primaryPayerParticipantId
  );

  if (directContribution) {
    return directContribution.participantName;
  }

  return detail.contributions[0]?.participantName ?? "Unknown";
}

export function HomePage() {
  const [name, setName] = useState("");
  const [savedVersion, setSavedVersion] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const { showToast } = useToast();

  const groups = useMemo(() => readSavedGroups(), [savedVersion]);
  const activeGroup = groups[0] ?? null;
  const activeGroupId = activeGroup?.id;

  const participantsQuery = useQuery({
    queryKey: ["participants", activeGroupId],
    queryFn: () => apiClient.listParticipants(activeGroupId!),
    enabled: Boolean(activeGroupId)
  });

  const billsQuery = useQuery({
    queryKey: ["bills", activeGroupId],
    queryFn: () => apiClient.listBills(activeGroupId!),
    enabled: Boolean(activeGroupId)
  });

  const settlementsQuery = useQuery({
    queryKey: ["settlements", activeGroupId],
    queryFn: () => apiClient.getSettlements(activeGroupId!),
    enabled: Boolean(activeGroupId)
  });

  const recentBills = useMemo(() => {
    return [...(billsQuery.data ?? [])]
      .sort((left, right) => new Date(right.transactionDateUtc).getTime() - new Date(left.transactionDateUtc).getTime())
      .slice(0, 3);
  }, [billsQuery.data]);

  const billDetailQueries = useQueries({
    queries: recentBills.map((bill) => ({
      queryKey: ["bill", activeGroupId, bill.id],
      queryFn: () => apiClient.getBill(activeGroupId!, bill.id),
      enabled: Boolean(activeGroupId)
    }))
  });

  const recentBillDetails = recentBills
    .map((bill, index) => {
      const detail = billDetailQueries[index]?.data;
      return detail ? { summary: bill, detail } : null;
    })
    .filter((item): item is { summary: BillSummaryDto; detail: BillDetailDto } => item !== null);
  const balanceNameById = Object.fromEntries(
    (settlementsQuery.data?.netBalances ?? []).map((balance) => [balance.participantId, balance.participantName])
  );

  const totalSpend = useMemo(
    () => (billsQuery.data ?? []).reduce((sum, bill) => sum + bill.grandTotalAmount, 0),
    [billsQuery.data]
  );

  const transferCount = settlementsQuery.data?.transfers.length ?? 0;
  const memberCount = participantsQuery.data?.length ?? 0;
  const billCount = billsQuery.data?.length ?? 0;

  const createGroup = useMutation({
    mutationFn: () => apiClient.createGroup(name.trim()),
    onSuccess: (group) => {
      saveGroup({ id: group.id, name: group.name });
      setSavedVersion((v) => v + 1);
      setName("");
      setFormError(null);
      inputRef.current?.focus();
      showToast({
        title: t("home.createGroup"),
        description: t("feedback.created"),
        tone: "success"
      });
    },
    onError: (error) => {
      showToast({
        title: t("feedback.requestFailed"),
        description: getErrorMessage(error),
        tone: "error"
      });
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (createGroup.isPending) {
      return;
    }

    if (!name.trim()) {
      setFormError(t("home.nameRequired"));
      inputRef.current?.focus();
      return;
    }

    setFormError(null);
    createGroup.mutate();
  }

  const hasOverviewError =
    participantsQuery.isError ||
    billsQuery.isError ||
    settlementsQuery.isError ||
    billDetailQueries.some((query) => query.isError);
  const isOverviewLoading =
    activeGroupId &&
    (participantsQuery.isPending ||
      billsQuery.isPending ||
      settlementsQuery.isPending ||
      billDetailQueries.some((query) => query.isPending));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <SectionCard className="overflow-hidden p-6 md:p-7">
          <PageHeading
            eyebrow={t("home.productEyebrow")}
            title={t("home.productTitle")}
            description={t("home.productBody")}
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-[28px] border border-brand/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.09),rgba(255,255,255,0.98))] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand">
                <WalletIcon className="h-4 w-4" />
                {t("home.currentWorkspace")}
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                {activeGroup?.name ?? t("home.noActiveWorkspace")}
              </div>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate">
                {activeGroup ? t("home.currentWorkspaceBody") : t("home.noActiveWorkspaceBody")}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {activeGroup ? (
                  <>
                    <Link className="button-primary" to={`/groups/${activeGroup.id}/bills`}>
                      <ReceiptIcon className="h-4 w-4" />
                      {t("home.primaryAction")}
                    </Link>
                    <Link className="button-secondary" to={`/groups/${activeGroup.id}/participants`}>
                      <UsersIcon className="h-4 w-4" />
                      {t("home.secondaryAction")}
                    </Link>
                    <Link className="button-secondary" to={`/groups/${activeGroup.id}/settlements`}>
                      <ArrowsIcon className="h-4 w-4" />
                      {t("home.settlementAction")}
                    </Link>
                  </>
                ) : (
                  <button className="button-primary" onClick={() => inputRef.current?.focus()} type="button">
                    <PlusIcon className="h-4 w-4" />
                    {t("home.createGroup")}
                  </button>
                )}
              </div>
            </div>

            <div className="surface-muted p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <SparklesIcon className="h-4 w-4 text-brand" />
                {t("home.flowTitle")}
              </div>
              <div className="mt-4 space-y-3">
                {[
                  t("home.quickStart1"),
                  t("home.quickStart2"),
                  t("home.quickStart3"),
                  t("home.quickStart4")
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-2xl bg-white/80 px-3 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm leading-6 text-slate">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-6">
          <PageHeading
            eyebrow={t("home.createGroup")}
            title={t("home.ctaTitle")}
            description={t("home.ctaBody")}
          />

          <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className={[
                "input-base flex-1",
                formError ? "border-danger focus:border-danger focus:ring-danger/10" : ""
              ].join(" ")}
              aria-invalid={Boolean(formError)}
              placeholder={t("home.groupPlaceholder")}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (formError) {
                  setFormError(null);
                }
              }}
            />
            <button className="button-primary w-full" disabled={createGroup.isPending || !name.trim()} type="submit">
              {createGroup.isPending ? <LoadingSpinner /> : <PlusIcon className="h-4 w-4" />}
              {createGroup.isPending ? `${t("home.create")}...` : t("home.create")}
            </button>
          </form>

          {formError ? (
            <div className="mt-3">
              <InlineMessage tone="error">{formError}</InlineMessage>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <StatTile
              label={t("home.savedCount")}
              value={String(groups.length).padStart(2, "0")}
              icon={<WalletIcon className="h-5 w-5" />}
              tone="brand"
            />
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-soft">
              <div className="text-sm font-semibold text-ink">{t("home.defaultInfo")}</div>
              <p className="mt-2 text-sm leading-6 text-slate">{t("home.defaultInfoBody")}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard className="p-6 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">{t("home.overviewEyebrow")}</span>
            <h2 className="mt-3 section-title">{t("home.overviewTitle")}</h2>
            <p className="mt-2 section-copy">{t("home.overviewBody")}</p>
          </div>
          {activeGroup ? (
            <Link className="button-secondary" to={`/groups/${activeGroup.id}/bills`}>
              <ReceiptIcon className="h-4 w-4" />
              {t("home.primaryAction")}
            </Link>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={t("participants.countLabel")}
            value={String(memberCount).padStart(2, "0")}
            icon={<UsersIcon className="h-5 w-5" />}
          />
          <StatTile
            label={t("home.totalBills")}
            value={String(billCount).padStart(2, "0")}
            icon={<ReceiptIcon className="h-5 w-5" />}
          />
          <StatTile
            label={t("home.totalSpend")}
            value={formatCurrency(totalSpend)}
            icon={<WalletIcon className="h-5 w-5" />}
            tone="brand"
          />
          <StatTile
            label={t("settlement.transfersCount")}
            value={String(transferCount).padStart(2, "0")}
            icon={<ArrowsIcon className="h-5 w-5" />}
            tone="warning"
          />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
          <article className="rounded-[24px] border border-slate-200/80 bg-white/92 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-ink">{t("home.currentBillOverview")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate">{t("home.currentBillOverviewBody")}</p>
              </div>
              <span className="tag bg-sky text-brand">{billCount}</span>
            </div>

            <div className="mt-5 space-y-3">
              {!activeGroup ? (
                <EmptyState
                  icon={<ReceiptIcon className="h-6 w-6" />}
                  title={t("home.noActiveWorkspace")}
                  description={t("home.noActiveWorkspaceBody")}
                  action={(
                    <button className="button-secondary" onClick={() => inputRef.current?.focus()} type="button">
                      {t("home.createGroup")}
                    </button>
                  )}
                />
              ) : hasOverviewError ? (
                <InlineMessage tone="error" title={t("feedback.loadFailed")}>
                  {getErrorMessage(
                    participantsQuery.error ??
                      billsQuery.error ??
                      settlementsQuery.error ??
                      billDetailQueries.find((query) => query.error)?.error
                  )}
                </InlineMessage>
              ) : isOverviewLoading ? (
                <LoadingState lines={3} />
              ) : recentBillDetails.length === 0 ? (
                <EmptyState
                  icon={<ReceiptIcon className="h-6 w-6" />}
                  title={t("bills.empty")}
                  description={t("home.currentBillEmpty")}
                  action={activeGroup ? (
                    <Link className="button-secondary" to={`/groups/${activeGroup.id}/bills`}>
                      {t("home.primaryAction")}
                    </Link>
                  ) : undefined}
                />
              ) : (
                recentBillDetails.map(({ summary, detail }) => (
                  <div key={summary.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-base font-semibold tracking-tight text-ink">{summary.storeName}</div>
                        <p className="mt-1 text-sm text-slate">
                          {t("home.paidBy")} {getPrimaryPayerName(detail)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate">{formatDate(summary.transactionDateUtc)}</div>
                        <div className="mt-1 text-lg font-semibold tracking-tight text-ink">
                          {formatCurrency(summary.grandTotalAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[24px] border border-slate-200/80 bg-white/92 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-ink">{t("home.settlementPreviewTitle")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate">{t("home.settlementPreviewBody")}</p>
              </div>
              <span className="tag bg-mint text-success">{transferCount}</span>
            </div>

            <div className="mt-5 space-y-3">
              {!activeGroup ? (
                <EmptyState
                  icon={<ArrowsIcon className="h-6 w-6" />}
                  title={t("home.noActiveWorkspace")}
                  description={t("home.noActiveWorkspaceBody")}
                />
              ) : hasOverviewError ? (
                <InlineMessage tone="error" title={t("feedback.loadFailed")}>
                  {getErrorMessage(
                    participantsQuery.error ??
                      billsQuery.error ??
                      settlementsQuery.error ??
                      billDetailQueries.find((query) => query.error)?.error
                  )}
                </InlineMessage>
              ) : isOverviewLoading ? (
                <LoadingState lines={3} />
              ) : settlementsQuery.data && settlementsQuery.data.transfers.length > 0 ? (
                settlementsQuery.data.transfers.slice(0, 3).map((transfer, index) => (
                  <div key={`${transfer.fromParticipantId}-${transfer.toParticipantId}-${index}`} className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate">{t("home.nextTransfer")}</div>
                        <div className="mt-2 text-base font-semibold tracking-tight text-ink">
                          {balanceNameById[transfer.fromParticipantId] ?? transfer.fromParticipantId.slice(0, 8)}
                        </div>
                        <div className="mt-1 text-sm text-slate">
                          {balanceNameById[transfer.fromParticipantId] ?? transfer.fromParticipantId.slice(0, 8)} {t("settlement.pays")}{" "}
                          {balanceNameById[transfer.toParticipantId] ?? transfer.toParticipantId.slice(0, 8)}
                        </div>
                      </div>
                      <div className="text-right text-lg font-semibold tracking-tight text-ink">
                        {formatCurrency(transfer.amount)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<ArrowsIcon className="h-6 w-6" />}
                  title={t("settlement.empty")}
                  description={t("home.settlementEmpty")}
                  action={activeGroup ? (
                    <Link className="button-secondary" to={`/groups/${activeGroup.id}/settlements`}>
                      {t("home.settlementAction")}
                    </Link>
                  ) : undefined}
                />
              )}
            </div>
          </article>
        </div>
      </SectionCard>

      <SectionCard className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">{t("home.recentGroups")}</span>
            <h2 className="mt-3 section-title">{t("home.recentGroups")}</h2>
            <p className="mt-2 section-copy">{t("home.savedCountBody")}</p>
          </div>
        </div>

        <div className="mt-5">
          {groups.length === 0 ? (
            <EmptyState
              icon={<WalletIcon className="h-6 w-6" />}
              title={t("home.emptyTitle")}
              description={t("home.emptyBody")}
              action={(
                <button className="button-secondary" onClick={() => inputRef.current?.focus()} type="button">
                  {t("common.focusInput")}
                </button>
              )}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {groups.map((group) => (
                <article key={group.id} className="list-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold tracking-tight text-ink">{group.name}</div>
                      <p className="mt-1 text-sm text-slate">{t("home.resumeGroup")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link className="button-pill" to={`/groups/${group.id}/participants`}>
                        <UsersIcon className="h-4 w-4" />
                        {t("home.participants")}
                      </Link>
                      <Link className="button-pill" to={`/groups/${group.id}/bills`}>
                        <ReceiptIcon className="h-4 w-4" />
                        {t("home.bills")}
                      </Link>
                      <Link className="button-pill" to={`/groups/${group.id}/settlements`}>
                        <ArrowsIcon className="h-4 w-4" />
                        {t("home.settlement")}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
