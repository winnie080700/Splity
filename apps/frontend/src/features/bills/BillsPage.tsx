import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type BillParticipantInput, type FeeType, type SplitMode } from "@api-client";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatCurrency, formatDate, getErrorMessage } from "@/shared/utils/format";
import { EmptyState, InlineMessage, LoadingSpinner, LoadingState, PageHeading, SectionCard, StatTile } from "@/shared/ui/primitives";
import { CalendarIcon, ReceiptIcon, SparklesIcon, UsersIcon, WalletIcon } from "@/shared/ui/icons";
import { useToast } from "@/shared/ui/toast";

type BillFieldErrors = Partial<Record<"storeName" | "transactionDateUtc" | "itemDescription" | "itemAmount" | "feeName" | "feeValue" | "primaryPayer" | "weights", string>>;

function normaliseMoneyValue(value: string) {
  if (value.trim() === "") {
    return value;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue.toFixed(2) : value;
}

function normaliseNumberValue(value: string) {
  if (value.trim() === "") {
    return value;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? String(numberValue) : value;
}

export function BillsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState("GrocerX");
  const [transactionDateUtc, setTransactionDateUtc] = useState(() => new Date().toISOString().slice(0, 10));
  const [splitMode, setSplitMode] = useState<SplitMode>(1);
  const [itemDescription, setItemDescription] = useState("Groceries");
  const [itemAmount, setItemAmount] = useState("100");
  const [feeName, setFeeName] = useState("SST");
  const [feeType, setFeeType] = useState<FeeType>(1);
  const [feeValue, setFeeValue] = useState("6");
  const [primaryPayerParticipantId, setPrimaryPayerParticipantId] = useState<string>("");
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<BillFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const storeInputRef = useRef<HTMLInputElement>(null);
  const transactionDateRef = useRef<HTMLInputElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const feeNameInputRef = useRef<HTMLInputElement>(null);
  const feeValueInputRef = useRef<HTMLInputElement>(null);
  const primaryPayerRef = useRef<HTMLSelectElement>(null);
  const weightInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const participantsQuery = useQuery({
    queryKey: ["participants", groupId],
    queryFn: () => apiClient.listParticipants(groupId!),
    enabled: Boolean(groupId)
  });

  const billsQuery = useQuery({
    queryKey: ["bills", groupId],
    queryFn: () => apiClient.listBills(groupId!),
    enabled: Boolean(groupId)
  });

  const participants = participantsQuery.data ?? [];
  const primaryPayer = useMemo(() => {
    if (primaryPayerParticipantId) {
      return primaryPayerParticipantId;
    }

    return participants[0]?.id ?? "";
  }, [participants, primaryPayerParticipantId]);

  const itemAmountNumber = Number(itemAmount);
  const feeValueNumber = Number(feeValue);
  const estimatedFee = Number.isFinite(feeValueNumber)
    ? feeType === 1
      ? ((Number.isFinite(itemAmountNumber) ? itemAmountNumber : 0) * feeValueNumber) / 100
      : feeValueNumber
    : 0;
  const estimatedTotal = (Number.isFinite(itemAmountNumber) ? itemAmountNumber : 0) + estimatedFee;

  const createBillMutation = useMutation({
    mutationFn: async () => {
      const billParticipants: BillParticipantInput[] = participants.map((participant) => ({
        participantId: participant.id,
        weight: splitMode === 2 ? Number(weights[participant.id] ?? "1") : null
      }));

      return apiClient.createBill(groupId!, {
        storeName: storeName.trim(),
        transactionDateUtc: new Date(transactionDateUtc).toISOString(),
        splitMode,
        primaryPayerParticipantId: primaryPayer,
        items: [{ description: itemDescription.trim(), amount: Number(itemAmount) }],
        fees: [{ name: feeName.trim(), feeType, value: Number(feeValue) }],
        participants: billParticipants,
        extraContributions: []
      });
    },
    onSuccess: async () => {
      setFieldErrors({});
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bills", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["settlements", groupId] })
      ]);
      itemInputRef.current?.focus();
      showToast({
        title: t("bills.create"),
        description: t("feedback.saved"),
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

  function clearFieldError(field: keyof BillFieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });

    if (formError) {
      setFormError(null);
    }
  }

  function getFieldClass(field: keyof BillFieldErrors, extraClassName = "") {
    return [
      "input-base",
      fieldErrors[field] ? "border-danger focus:border-danger focus:ring-danger/10" : "",
      extraClassName
    ].filter(Boolean).join(" ");
  }

  function focusFirstInvalidField(field: keyof BillFieldErrors, participantId?: string) {
    if (field === "storeName") {
      storeInputRef.current?.focus();
    } else if (field === "transactionDateUtc") {
      transactionDateRef.current?.focus();
    } else if (field === "itemDescription") {
      itemInputRef.current?.focus();
    } else if (field === "itemAmount") {
      amountInputRef.current?.focus();
    } else if (field === "feeName") {
      feeNameInputRef.current?.focus();
    } else if (field === "feeValue") {
      feeValueInputRef.current?.focus();
    } else if (field === "primaryPayer") {
      primaryPayerRef.current?.focus();
    } else if (field === "weights" && participantId) {
      weightInputRefs.current[participantId]?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!groupId || createBillMutation.isPending) {
      return;
    }

    if (participants.length === 0) {
      setFormError(t("bills.noParticipantsBody"));
      showToast({
        title: t("feedback.validationFailed"),
        description: t("bills.noParticipantsBody"),
        tone: "error"
      });
      return;
    }

    const nextErrors: BillFieldErrors = {};
    let firstInvalidField: { field: keyof BillFieldErrors; participantId?: string } | null = null;

    function setInvalid(field: keyof BillFieldErrors, message: string, participantId?: string) {
      if (!nextErrors[field]) {
        nextErrors[field] = message;
      }

      if (!firstInvalidField) {
        firstInvalidField = { field, participantId };
      }
    }

    if (!storeName.trim()) {
      setInvalid("storeName", t("bills.storeRequired"));
    }

    if (!transactionDateUtc || Number.isNaN(new Date(transactionDateUtc).getTime())) {
      setInvalid("transactionDateUtc", t("bills.dateRequired"));
    }

    if (!itemDescription.trim()) {
      setInvalid("itemDescription", t("bills.itemRequired"));
    }

    if (!Number.isFinite(itemAmountNumber) || itemAmountNumber <= 0) {
      setInvalid("itemAmount", t("bills.amountInvalid"));
    }

    if (!Number.isFinite(feeValueNumber) || feeValueNumber < 0) {
      setInvalid("feeValue", t("bills.feeInvalid"));
    }

    if ((Number.isFinite(feeValueNumber) ? feeValueNumber : 0) > 0 && !feeName.trim()) {
      setInvalid("feeName", t("bills.feeNameRequired"));
    }

    if (!primaryPayer) {
      setInvalid("primaryPayer", t("bills.payerRequired"));
    }

    if (splitMode === 2) {
      for (const participant of participants) {
        const weightValue = Number(weights[participant.id] ?? "1");
        if (!Number.isFinite(weightValue) || weightValue <= 0) {
          setInvalid("weights", t("bills.weightInvalid"), participant.id);
          break;
        }
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.values(nextErrors)[0] ?? t("feedback.validationFailed");
      setFieldErrors(nextErrors);
      setFormError(firstError);
      showToast({
        title: t("feedback.validationFailed"),
        description: firstError,
        tone: "error"
      });

      if (firstInvalidField) {
        focusFirstInvalidField(firstInvalidField.field, firstInvalidField.participantId);
      }

      return;
    }

    setFieldErrors({});
    setFormError(null);
    createBillMutation.mutate();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.96fr,1.04fr]">
      <SectionCard className="p-6">
        <PageHeading
          eyebrow={t("nav.bills")}
          title={t("bills.create")}
          description={t("bills.subtitle")}
        />

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <StatTile
            label={t("bills.subtotal")}
            value={formatCurrency(Number.isFinite(itemAmountNumber) ? itemAmountNumber : 0)}
            icon={<ReceiptIcon className="h-5 w-5" />}
          />
          <StatTile
            label={t("bills.fees")}
            value={formatCurrency(estimatedFee)}
            icon={<SparklesIcon className="h-5 w-5" />}
            tone="warning"
          />
          <StatTile
            label={t("bills.total")}
            value={formatCurrency(estimatedTotal)}
            icon={<WalletIcon className="h-5 w-5" />}
            tone="brand"
          />
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("bills.store")}</span>
              <input
                ref={storeInputRef}
                className={getFieldClass("storeName")}
                aria-invalid={Boolean(fieldErrors.storeName)}
                value={storeName}
                onChange={(e) => {
                  setStoreName(e.target.value);
                  clearFieldError("storeName");
                }}
                placeholder={t("bills.store")}
              />
              {fieldErrors.storeName ? <p className="text-sm font-medium text-danger">{fieldErrors.storeName}</p> : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("bills.date")}</span>
              <input
                ref={transactionDateRef}
                className={getFieldClass("transactionDateUtc")}
                aria-invalid={Boolean(fieldErrors.transactionDateUtc)}
                type="date"
                value={transactionDateUtc}
                onChange={(e) => {
                  setTransactionDateUtc(e.target.value);
                  clearFieldError("transactionDateUtc");
                }}
              />
              {fieldErrors.transactionDateUtc ? <p className="text-sm font-medium text-danger">{fieldErrors.transactionDateUtc}</p> : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("bills.splitMode")}</span>
              <select
                className={getFieldClass("weights")}
                value={splitMode}
                onChange={(e) => {
                  setSplitMode(Number(e.target.value) as SplitMode);
                  clearFieldError("weights");
                }}
              >
                <option value={1}>{t("bills.equal")}</option>
                <option value={2}>{t("bills.weighted")}</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">{t("bills.primaryPayer")}</span>
              <select
                ref={primaryPayerRef}
                className={getFieldClass("primaryPayer")}
                aria-invalid={Boolean(fieldErrors.primaryPayer)}
                value={primaryPayer}
                onChange={(e) => {
                  setPrimaryPayerParticipantId(e.target.value);
                  clearFieldError("primaryPayer");
                }}
              >
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>{participant.name}</option>
                ))}
              </select>
              {fieldErrors.primaryPayer ? <p className="text-sm font-medium text-danger">{fieldErrors.primaryPayer}</p> : null}
            </label>
          </div>

          <div className="surface-muted p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.item")}</span>
                <input
                  ref={itemInputRef}
                  className={getFieldClass("itemDescription")}
                  aria-invalid={Boolean(fieldErrors.itemDescription)}
                  value={itemDescription}
                  onChange={(e) => {
                    setItemDescription(e.target.value);
                    clearFieldError("itemDescription");
                  }}
                  placeholder={t("bills.item")}
                />
                {fieldErrors.itemDescription ? <p className="text-sm font-medium text-danger">{fieldErrors.itemDescription}</p> : null}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.amount")}</span>
                <input
                  ref={amountInputRef}
                  className={getFieldClass("itemAmount", "text-right tabular-nums")}
                  aria-invalid={Boolean(fieldErrors.itemAmount)}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={itemAmount}
                  onBlur={() => setItemAmount((current) => normaliseMoneyValue(current))}
                  onChange={(e) => {
                    setItemAmount(e.target.value);
                    clearFieldError("itemAmount");
                  }}
                  placeholder={t("bills.amount")}
                />
                {fieldErrors.itemAmount ? <p className="text-sm font-medium text-danger">{fieldErrors.itemAmount}</p> : null}
              </label>
            </div>
          </div>

          <div className="surface-muted p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.feeName")}</span>
                <input
                  ref={feeNameInputRef}
                  className={getFieldClass("feeName")}
                  aria-invalid={Boolean(fieldErrors.feeName)}
                  value={feeName}
                  onChange={(e) => {
                    setFeeName(e.target.value);
                    clearFieldError("feeName");
                  }}
                  placeholder={t("bills.feeName")}
                />
                {fieldErrors.feeName ? <p className="text-sm font-medium text-danger">{fieldErrors.feeName}</p> : null}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.fees")}</span>
                <select className="input-base" value={feeType} onChange={(e) => setFeeType(Number(e.target.value) as FeeType)}>
                  <option value={1}>{t("bills.percentage")}</option>
                  <option value={2}>{t("bills.fixed")}</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-ink">{t("bills.feeValue")}</span>
                <input
                  ref={feeValueInputRef}
                  className={getFieldClass("feeValue", "text-right tabular-nums")}
                  aria-invalid={Boolean(fieldErrors.feeValue)}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={feeValue}
                  onBlur={() => setFeeValue((current) => normaliseMoneyValue(current))}
                  onChange={(e) => {
                    setFeeValue(e.target.value);
                    clearFieldError("feeValue");
                  }}
                  placeholder={t("bills.feeValue")}
                />
                {fieldErrors.feeValue ? <p className="text-sm font-medium text-danger">{fieldErrors.feeValue}</p> : null}
              </label>
            </div>
          </div>

          {splitMode === 2 ? (
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <UsersIcon className="h-4 w-4 text-brand" />
                {t("bills.weightSettings")}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate">{t("bills.formHint")}</p>
              <div className="mt-4 space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3">
                    <span className="text-sm font-medium text-ink">{participant.name}</span>
                    <input
                      ref={(element) => {
                        weightInputRefs.current[participant.id] = element;
                      }}
                      className={getFieldClass("weights", "w-28 text-right tabular-nums")}
                      aria-invalid={Boolean(fieldErrors.weights)}
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      value={weights[participant.id] ?? "1"}
                      onBlur={(event) => {
                        setWeights((current) => ({
                          ...current,
                          [participant.id]: normaliseNumberValue(event.target.value)
                        }));
                      }}
                      onChange={(event) => {
                        setWeights((current) => ({ ...current, [participant.id]: event.target.value }));
                        clearFieldError("weights");
                      }}
                    />
                  </div>
                ))}
              </div>
              {fieldErrors.weights ? <p className="mt-3 text-sm font-medium text-danger">{fieldErrors.weights}</p> : null}
            </div>
          ) : null}

          {participantsQuery.isError ? (
            <InlineMessage
              tone="error"
              title={t("feedback.loadFailed")}
              action={(
                <button className="button-secondary" onClick={() => participantsQuery.refetch()} type="button">
                  {t("common.retry")}
                </button>
              )}
            >
              {getErrorMessage(participantsQuery.error)}
            </InlineMessage>
          ) : null}

          {formError ? <InlineMessage tone="error">{formError}</InlineMessage> : null}

          {participants.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-6 w-6" />}
              title={t("bills.noParticipantsTitle")}
              description={t("bills.noParticipantsBody")}
              action={groupId ? (
                <Link className="button-secondary" to={`/groups/${groupId}/participants`}>
                  {t("nav.participants")}
                </Link>
              ) : undefined}
            />
          ) : null}

          <button
            className="button-primary w-full"
            disabled={!groupId || participants.length === 0 || createBillMutation.isPending}
            type="submit"
          >
            {createBillMutation.isPending ? <LoadingSpinner /> : <ReceiptIcon className="h-4 w-4" />}
            {createBillMutation.isPending ? `${t("bills.save")}...` : t("bills.save")}
          </button>
        </form>
      </SectionCard>

      <div className="space-y-6">
        <SectionCard className="p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="section-title">{t("bills.preview")}</h2>
              <p className="mt-2 section-copy">{t("bills.formHint")}</p>
            </div>
            <span className="tag bg-sky text-brand">
              <CalendarIcon className="mr-1 h-3.5 w-3.5" />
              {transactionDateUtc}
            </span>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(37,99,235,0.06),rgba(255,255,255,0.95))] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate">{storeName}</div>
                <div className="mt-1 text-3xl font-semibold tracking-tight text-ink">{formatCurrency(estimatedTotal)}</div>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-soft">
                <WalletIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/90 px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">{t("bills.subtotal")}</div>
                <div className="mt-2 font-semibold text-ink">{formatCurrency(Number.isFinite(itemAmountNumber) ? itemAmountNumber : 0)}</div>
              </div>
              <div className="rounded-2xl bg-white/90 px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">{t("bills.fees")}</div>
                <div className="mt-2 font-semibold text-ink">{formatCurrency(estimatedFee)}</div>
              </div>
              <div className="rounded-2xl bg-white/90 px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">{t("nav.participants")}</div>
                <div className="mt-2 font-semibold text-ink">{participants.length}</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title">{t("bills.title")}</h2>
              <p className="mt-2 section-copy">{t("bills.subtitle")}</p>
            </div>
            <span className="tag bg-mint text-success">{billsQuery.data?.length ?? 0} {t("nav.bills")}</span>
          </div>

          <div className="mt-5 space-y-3">
            {billsQuery.isError ? (
              <InlineMessage
                tone="error"
                title={t("feedback.loadFailed")}
                action={(
                  <button className="button-secondary" onClick={() => billsQuery.refetch()} type="button">
                    {t("common.retry")}
                  </button>
                )}
              >
                {getErrorMessage(billsQuery.error)}
              </InlineMessage>
            ) : billsQuery.isPending ? (
              <LoadingState lines={3} />
            ) : (billsQuery.data?.length ?? 0) === 0 ? (
              <EmptyState
                icon={<ReceiptIcon className="h-6 w-6" />}
                title={t("bills.empty")}
                description={t("bills.emptyBody")}
                action={(
                  <button className="button-secondary" onClick={() => storeInputRef.current?.focus()} type="button">
                    {t("common.focusInput")}
                  </button>
                )}
              />
            ) : (
              billsQuery.data?.map((bill) => (
                <article key={bill.id} className="list-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky text-brand">
                          <ReceiptIcon className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-lg font-semibold tracking-tight text-ink">{bill.storeName}</div>
                          <div className="mt-1 text-sm text-slate">{formatDate(bill.transactionDateUtc)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate">{t("bills.total")}</div>
                      <div className="mt-1 text-2xl font-semibold tracking-tight text-ink">{formatCurrency(bill.grandTotalAmount)}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50/90 px-3 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">{t("bills.subtotal")}</div>
                      <div className="mt-2 font-semibold text-ink">{formatCurrency(bill.subtotalAmount)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50/90 px-3 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">{t("bills.fees")}</div>
                      <div className="mt-2 font-semibold text-ink">{formatCurrency(bill.totalFeeAmount)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50/90 px-3 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">{t("bills.splitMode")}</div>
                      <div className="mt-2 font-semibold text-ink">{bill.splitMode === 2 ? t("bills.weighted") : t("bills.equal")}</div>
                    </div>
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
