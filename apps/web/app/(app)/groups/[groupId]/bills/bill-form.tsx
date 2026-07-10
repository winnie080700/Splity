"use client";

import {
  CalendarDaysIcon,
  FileTextIcon,
  ListChecksIcon,
  PercentIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { clearRouteSuccess, queueRouteSuccess } from "@/components/ui/route-toast";
import { Select } from "@/components/ui/select";
import { calculateBillShares } from "@/lib/calculations/bill-calculator";
import { FEE_TYPE, SPLIT_MODE, type FeeType, type SplitMode } from "@/lib/calculations/types";
import { useTranslation } from "@/lib/i18n";
import type { BillActionState } from "./actions";
import type { BillDetail } from "@/lib/calculations/bill-read-projection";
import type { Participant } from "@/lib/services/participants";

type FormItem = {
  id?: string;
  description: string;
  amount: string;
  responsibleParticipantIds: string[];
};

type FormFee = {
  name: string;
  feeType: FeeType;
  value: string;
};

type BillFormProps = {
  action: (prevState: BillActionState, formData: FormData) => Promise<BillActionState>;
  cancelHref?: string;
  canEdit: boolean;
  initialBill?: BillDetail;
  onCancel?: () => void;
  participants: Participant[];
  routeSuccess?: boolean;
};

type BillSummaryData = Pick<
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
  | "shares"
>;

const initialState: BillActionState = { error: null };

function toDateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

const primaryButtonClass =
  "!rounded-xl !border-0 !bg-[#087f6f] !font-bold !text-white !shadow-[0_10px_22px_rgba(8,127,111,0.18)] hover:!bg-[#066c60] focus-visible:!outline-[#087f6f]";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  const toastId = useRef<string | number | null>(null);

  useEffect(() => {
    if (pending && toastId.current === null) {
      toastId.current = toast.loading(t("common.saving"));
    }

    if (!pending && toastId.current !== null) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }

    return () => {
      if (toastId.current !== null) {
        toast.dismiss(toastId.current);
        toastId.current = null;
      }
    };
  }, [pending, t]);

  return (
    <Button className={`${primaryButtonClass} gap-2`} disabled={disabled || pending} type="submit">
      {pending ? <><Spinner />{t("common.saving")}</> : t("bills.saveBill")}
    </Button>
  );
}

function CancelButton({
  cancelHref,
  onCancel,
}: {
  cancelHref?: string;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const className = "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]";

  if (cancelHref) {
    return (
      <Link className={className} href={cancelHref}>
        {t("common.cancel")}
      </Link>
    );
  }

  return (
    <button className={className} onClick={onCancel} type="button">
      {t("common.cancel")}
    </button>
  );
}

function BillSummaryPanel({
  bill,
  participants,
}: {
  bill: BillSummaryData;
  participants: Participant[];
}) {
  const { t } = useTranslation();
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const payer = participantById.get(bill.primaryPayerParticipantId);
  const splitModeLabel = bill.splitMode === SPLIT_MODE.weighted ? t("groupDetail.splitUneven") : t("groupDetail.splitEqual");
  const feeAmount = bill.appliedFees.reduce(
    (sum, fee) => sum + Math.max(0, Number(fee.appliedAmount)),
    0
  );
  const discountAmount = bill.appliedFees.reduce(
    (sum, fee) => sum + Math.min(0, Number(fee.appliedAmount)),
    0
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white p-4 shadow-[0_2px_8px_rgba(12,21,56,0.06)]">
      <div className="pb-3">
        <h2 className="font-extrabold text-[var(--splity-ink)]">{t("bills.billSummary")}</h2>
      </div>
      <div className="border-b border-[var(--splity-line)] pb-3">
        <p className="text-xs font-bold text-[var(--splity-muted)]">{t("bills.total")}</p>
        <p className="splity-display mt-1 text-3xl font-extrabold text-[#087f6f]">{money(bill.grandTotalAmount, bill.currencyCode)}</p>
        <div className="mt-3 grid gap-0.5">
          <SummaryLine label={t("bills.subtotal")} value={money(bill.subtotalAmount, bill.currencyCode)} />
          <SummaryLine label={t("bills.fees")} value={money(String(feeAmount), bill.currencyCode)} />
          <SummaryLine
            label={t("bills.discounts")}
            value={`− ${money(String(Math.abs(discountAmount)), bill.currencyCode)}`}
          />
          <div className="mt-2 border-t border-[var(--splity-line)] pt-2">
            <SummaryLine label={t("bills.grandTotal")} value={money(bill.grandTotalAmount, bill.currencyCode)} strong />
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--splity-line)] py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-extrabold text-[var(--splity-ink)]">{t("bills.splitPreview")}</h3>
          <span className="rounded-full bg-[var(--splity-bg)] px-2 py-1 text-[10px] font-bold text-[var(--splity-muted)]">
            {splitModeLabel}
          </span>
        </div>
        {bill.shares.length ? (
          <p className="mt-1 text-xs font-bold text-[var(--splity-muted)]">
            {t("bills.splitParticipantSummary").replace("{count}", String(bill.shares.length))}
          </p>
        ) : null}
        <div className="mt-2 grid gap-0.5">
          {bill.shares.length ? (
            bill.shares.map((share) => (
              <SummaryLine
                key={share.participantId}
                label={participantById.get(share.participantId)?.name ?? t("bills.unknown")}
                value={money(share.totalShareAmount, bill.currencyCode)}
              />
            ))
          ) : (
            <p className="text-sm font-semibold text-[var(--splity-muted)]">{t("bills.needParticipant")}</p>
          )}
        </div>
      </div>

      <div className="pt-3">
        <h3 className="font-extrabold text-[var(--splity-ink)]">{t("bills.billInfo")}</h3>
        <div className="mt-2 grid gap-0.5">
          <SummaryLine label={t("groupDetail.store")} value={bill.storeName || t("bills.storeName")} />
          <SummaryLine label={t("groupDetail.date")} value={formatDate(bill.transactionDateUtc)} />
          <SummaryLine label={t("bills.primaryPayer")} value={payer?.name ?? t("bills.unknown")} />
          <SummaryLine label={t("bills.splitMode")} value={splitModeLabel} />
          <SummaryLine label={t("bills.items")} value={t("bills.itemCount").replace("{count}", String(bill.items.length))} />
        </div>
      </div>
    </section>
  );
}

function SummaryLine({
  label,
  strong,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-bold text-[var(--splity-muted)]">{label}</span>
      <span className={strong ? "text-sm font-extrabold text-[#087f6f]" : "text-sm font-bold text-[var(--splity-ink)]"}>
        {value}
      </span>
    </div>
  );
}

function currencyLabel(currencyCode: string) {
  return currencyCode === "MYR" ? "RM" : currencyCode;
}

function money(amount: string, currencyCode: string) {
  return `${currencyLabel(currencyCode)} ${Number(amount || 0).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function BillForm({
  action,
  cancelHref,
  canEdit,
  initialBill,
  onCancel,
  participants,
  routeSuccess = true,
}: BillFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const { locale, t } = useTranslation();
  const firstParticipantId = participants[0]?.id ?? "";
  const [storeName, setStoreName] = useState(initialBill?.storeName ?? "");
  const [date, setDate] = useState(toDateInput(initialBill?.transactionDateUtc));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [primaryPayerParticipantId, setPrimaryPayerParticipantId] = useState(
    initialBill?.primaryPayerParticipantId ?? firstParticipantId
  );
  const [splitMode, setSplitMode] = useState<SplitMode>(initialBill?.splitMode ?? SPLIT_MODE.equal);
  const [items, setItems] = useState<FormItem[]>(
    initialBill?.items.length
      ? initialBill.items
      : []
  );
  const [fees, setFees] = useState<FormFee[]>(
    initialBill?.fees.map((fee) => ({
      name: fee.name,
      feeType: fee.feeType === FEE_TYPE.percentage ? FEE_TYPE.percentage : FEE_TYPE.fixed,
      value: fee.value,
    })) ?? []
  );
  const [weights, setWeights] = useState<Record<string, string>>(
    Object.fromEntries(
      participants.map((participant) => [
        participant.id,
        initialBill?.shares.find((share) => share.participantId === participant.id)?.weight ?? "1.0000",
      ])
    )
  );
  const participantOptions = participants.map((participant) => ({
    label: participant.name,
    value: participant.id,
  }));
  const feeTypeOptions = [
    { label: t("bills.percent"), value: String(FEE_TYPE.percentage) },
    { label: t("bills.fixed"), value: String(FEE_TYPE.fixed) },
  ];
  const splitModeOptions = [
    { label: t("bills.equal"), value: String(SPLIT_MODE.equal) },
    { label: t("bills.weighted"), value: String(SPLIT_MODE.weighted) },
  ];
  const compactInputClassName =
    "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-[#087f6f] focus:ring-2 focus:ring-[rgba(8,127,111,0.12)]";
  const tableHeaderClassName = "px-1 text-xs font-bold text-[var(--splity-muted)]";

  const payload = useMemo(
    () =>
      JSON.stringify({
        storeName,
        transactionDateUtc: new Date(`${date}T00:00:00.000Z`).toISOString(),
        currencyCode: "MYR",
        splitMode,
        primaryPayerParticipantId,
        participantSplits: participants.map((participant) => ({
          participantId: participant.id,
          weight: splitMode === SPLIT_MODE.equal ? "1.0000" : (weights[participant.id] ?? "1.0000"),
        })),
        items,
        fees,
      }),
    [storeName, date, splitMode, primaryPayerParticipantId, participants, weights, items, fees]
  );

  const participantSplits = useMemo(
    () =>
      participants.map((participant) => ({
        participantId: participant.id,
        weight:
          splitMode === SPLIT_MODE.equal
            ? "1.0000"
            : (weights[participant.id] ?? "1.0000"),
      })),
    [participants, splitMode, weights]
  );
  const previewBill = useMemo<BillSummaryData>(() => {
    try {
      const result = calculateBillShares({
        participantSplits,
        items,
        fees,
        primaryPayerParticipantId,
      });

      return {
        storeName,
        transactionDateUtc: new Date(`${date}T00:00:00.000Z`).toISOString(),
        currencyCode: "MYR",
        splitMode,
        primaryPayerParticipantId,
        subtotalAmount: result.subtotalAmount,
        totalFeeAmount: result.totalFeeAmount,
        grandTotalAmount: result.grandTotalAmount,
        appliedFees: result.appliedFees,
        shares: result.shares,
        items: items.map((item, index) => ({
          id: item.id ?? `preview-${index}`,
          description: item.description,
          amount: item.amount,
          responsibleParticipantIds: item.responsibleParticipantIds,
        })),
      };
    } catch {
      const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const appliedFees = fees
        .filter((fee) => Number(fee.value || 0) !== 0)
        .map((fee, index) => {
          const value = Number(fee.value || 0);
          const appliedAmount =
            fee.feeType === FEE_TYPE.percentage ? subtotal * (value / 100) : value;
          return {
            name: fee.name || `${t("bills.fee")} ${index + 1}`,
            feeType: fee.feeType,
            value: value.toFixed(2),
            appliedAmount: appliedAmount.toFixed(2),
          };
        });
      const totalFee = appliedFees.reduce(
        (sum, fee) => sum + Number(fee.appliedAmount),
        0
      );

      return {
        storeName,
        transactionDateUtc: new Date(`${date}T00:00:00.000Z`).toISOString(),
        currencyCode: "MYR",
        splitMode,
        primaryPayerParticipantId,
        subtotalAmount: subtotal.toFixed(2),
        totalFeeAmount: totalFee.toFixed(2),
        grandTotalAmount: (subtotal + totalFee).toFixed(2),
        appliedFees,
        shares: [],
        items: items.map((item, index) => ({
          id: item.id ?? `preview-${index}`,
          description: item.description,
          amount: Number(item.amount || 0).toFixed(2),
          responsibleParticipantIds: item.responsibleParticipantIds,
        })),
      };
    }
  }, [
    date,
    fees,
    items,
    participantSplits,
    primaryPayerParticipantId,
    splitMode,
    storeName,
    t,
  ]);

  const disabled = !canEdit || participants.length === 0;

  useEffect(() => {
    if (state.error) {
      clearRouteSuccess();
      toast.error(state.error);
    }
  }, [state.error]);

  return (
    <form
      action={formAction}
      className="flex max-h-[calc(100dvh-10rem)] min-h-0 flex-col"
      onSubmit={() => {
        if (routeSuccess) queueRouteSuccess("bills.saved");
      }}
    >
      <input name="payload" type="hidden" value={payload} />
      <Alert tone="error">{state.error}</Alert>
      {!canEdit ? <Alert tone="info">{t("bills.groupLocked")}</Alert> : null}
      {participants.length === 0 ? <Alert tone="error">{t("bills.needParticipant")}</Alert> : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 lg:overflow-y-hidden lg:pr-0">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(290px,0.86fr)]">
          <section className="content-start overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white shadow-[0_2px_8px_rgba(12,21,56,0.04)]">
            <div className="grid gap-3 p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-[#087f6f]">
                  <FileTextIcon aria-hidden="true" className="size-4" />
                </span>
                <h3 className="font-extrabold text-[var(--splity-ink)]">{t("bills.billDetails")}</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label={t("bills.storeName")}
                  name="storeNameView"
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder={t("bills.storePlaceholder")}
                  required
                  value={storeName}
                />
                <div className="grid gap-2 text-sm font-medium text-zinc-800">
                  <span id="bill-date-label">{t("bills.date")}</span>
                  <input name="dateView" type="hidden" value={date} />
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        aria-labelledby="bill-date-label"
                        className="flex h-11 w-full items-center justify-between rounded-md border border-zinc-300 bg-white px-3 text-left text-base text-zinc-950 shadow-sm outline-none transition hover:border-[#087f6f] hover:bg-emerald-50 focus:border-[#087f6f] focus:ring-2 focus:ring-[rgba(8,127,111,0.12)]"
                        type="button"
                      >
                        <span>{format(parseISO(date), "PPP", { locale: locale === "zh" ? zhCN : enUS })}</span>
                        <CalendarDaysIcon aria-hidden="true" className="size-4 text-[#087f6f]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto overflow-hidden p-0">
                      <Calendar
                        mode="single"
                        selected={parseISO(date)}
                        onSelect={(nextDate) => {
                          if (!nextDate) return;
                          setDate(format(nextDate, "yyyy-MM-dd"));
                          setDatePickerOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Select
                  label={t("bills.primaryPayer")}
                  name="primaryPayerView"
                  onValueChange={setPrimaryPayerParticipantId}
                  options={participantOptions}
                  value={primaryPayerParticipantId}
                />
                <Select
                  label={t("bills.splitMode")}
                  name="splitModeView"
                  onValueChange={(value) => setSplitMode(Number(value) as SplitMode)}
                  options={splitModeOptions}
                  value={String(splitMode)}
                />
              </div>
              {splitMode === SPLIT_MODE.weighted ? (
                <div className="grid gap-3 border-t border-[var(--splity-line)] pt-4">
                  <h4 className="font-extrabold text-[var(--splity-ink)]">{t("bills.weight")}</h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    {participants.map((participant) => (
                      <Input
                        key={participant.id}
                        label={participant.name}
                        min="0.0001"
                        name={`weight${participant.id}`}
                        onChange={(event) => setWeights((current) => ({ ...current, [participant.id]: event.target.value }))}
                        step="0.0001"
                        type="number"
                        value={weights[participant.id] ?? "1.0000"}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 border-t border-[var(--splity-line)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-[#087f6f]">
                    <ListChecksIcon aria-hidden="true" className="size-4" />
                  </span>
                  <h3 className="font-extrabold text-[var(--splity-ink)]">{t("bills.items")}</h3>
                  <span className="rounded-full bg-[var(--splity-bg)] px-2 py-1 text-[10px] font-bold text-[var(--splity-muted)]">
                    {t("bills.itemCount").replace("{count}", String(items.length))}
                  </span>
                </div>
                <Button
                  className="h-10"
                  onClick={() =>
                    setItems((current) => [
                      ...current,
                      { description: "", amount: "", responsibleParticipantIds: participants.map((participant) => participant.id) },
                    ])
                  }
                >
                  <PlusIcon aria-hidden="true" className="mr-2 size-4" />
                  {t("bills.addItem")}
                </Button>
              </div>
              {items.length ? (
                <div className="max-h-[190px] overflow-auto pr-1">
                  <div className="grid min-w-[720px] gap-2">
                    <div className="grid grid-cols-[32px_minmax(0,5fr)_minmax(130px,2fr)_minmax(180px,3fr)_44px] items-center gap-2">
                      <span />
                      <span className={tableHeaderClassName}>{t("bills.description")}</span>
                      <span className={tableHeaderClassName}>{t("bills.amount")} (RM)</span>
                      <span className={tableHeaderClassName}>{t("bills.splitWith")}</span>
                      <span className="sr-only">{t("common.remove")}</span>
                    </div>
                    {items.map((item, index) => (
                      <div
                        className="grid grid-cols-[32px_minmax(0,5fr)_minmax(130px,2fr)_minmax(180px,3fr)_44px] items-center gap-2"
                        key={item.id ?? index}
                      >
                        <span className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--splity-line)] text-xs font-extrabold text-[var(--splity-muted)]">
                          {index + 1}
                        </span>
                        <input
                          aria-label={t("bills.description")}
                          className={compactInputClassName}
                          name={`itemDescription${index}`}
                          onChange={(event) =>
                            setItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry))
                          }
                          required
                          value={item.description}
                        />
                        <label className="flex h-10 items-center rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm transition focus-within:border-[#087f6f] focus-within:ring-2 focus-within:ring-[rgba(8,127,111,0.12)]">
                          <span className="mr-2 font-bold text-[var(--splity-muted)]">RM</span>
                          <input
                            aria-label={t("bills.amount")}
                            className="min-w-0 flex-1 bg-transparent outline-none"
                            min="0.01"
                            name={`itemAmount${index}`}
                            onChange={(event) =>
                              setItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, amount: event.target.value } : entry))
                            }
                            required
                            step="0.01"
                            type="number"
                            value={item.amount}
                          />
                        </label>
                        <MultiSelect
                          compact
                          label={t("bills.participant")}
                          name={`itemParticipant${index}`}
                          onValueChange={(value) =>
                            setItems((current) =>
                              current.map((entry, itemIndex) => itemIndex === index ? { ...entry, responsibleParticipantIds: value } : entry)
                            )
                          }
                          options={participantOptions}
                          placeholder={t("bills.none")}
                          value={item.responsibleParticipantIds}
                        />
                        <Button
                          aria-label={t("common.remove")}
                          className="size-9 border-transparent bg-emerald-50 px-0 text-[#087f6f] hover:border-[#087f6f] hover:bg-emerald-100 hover:text-[#066c60]"
                          onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          title={t("common.remove")}
                          variant="secondary"
                        >
                          <svg
                            aria-hidden="true"
                            fill="none"
                            height="16"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            style={{ display: "block", flex: "0 0 16px", height: 16, width: 16 }}
                            viewBox="0 0 24 24"
                            width="16"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  compact
                  description={t("bills.emptyItemsBody")}
                  icon={<ListChecksIcon aria-hidden="true" className="size-5" />}
                  title={t("bills.emptyItemsTitle")}
                />
              )}
            </div>

            <div className="grid gap-3 border-t border-[var(--splity-line)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-[#087f6f]">
                    <PercentIcon aria-hidden="true" className="size-4" />
                  </span>
                  <h3 className="font-extrabold text-[var(--splity-ink)]">{t("bills.feesAndDiscounts")}</h3>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    className="h-10 border-[#087f6f] text-[#087f6f]"
                    onClick={() => setFees((current) => [...current, { name: t("bills.discount"), feeType: FEE_TYPE.fixed, value: "" }])}
                    variant="secondary"
                  >
                    <PlusIcon aria-hidden="true" className="mr-2 size-4" />
                    {t("bills.addDiscount")}
                  </Button>
                  <Button
                    className="h-10 border-[#087f6f] text-[#087f6f]"
                    onClick={() => setFees((current) => [...current, { name: "", feeType: FEE_TYPE.percentage, value: "" }])}
                    variant="secondary"
                  >
                    <PlusIcon aria-hidden="true" className="mr-2 size-4" />
                    {t("bills.addFee")}
                  </Button>
                </div>
              </div>
              {fees.length ? (
                <div className="max-h-[130px] overflow-auto pr-1">
                  <div className="grid min-w-[640px] gap-2">
                    <div className="grid grid-cols-[minmax(0,5fr)_minmax(120px,2fr)_minmax(110px,2fr)_44px] items-center gap-2">
                      <span className={tableHeaderClassName}>{t("groups.name")}</span>
                      <span className={tableHeaderClassName}>{t("bills.type")}</span>
                      <span className={tableHeaderClassName}>{t("bills.value")}</span>
                      <span className="sr-only">{t("common.remove")}</span>
                    </div>
                    {fees.map((fee, index) => (
                      <div
                        className="grid grid-cols-[minmax(0,5fr)_minmax(120px,2fr)_minmax(110px,2fr)_44px] items-center gap-2"
                        key={index}
                      >
                        <input
                          aria-label={t("groups.name")}
                          className={compactInputClassName}
                          name={`feeName${index}`}
                          onChange={(event) => setFees((current) => current.map((entry, feeIndex) => feeIndex === index ? { ...entry, name: event.target.value } : entry))}
                          required
                          value={fee.name}
                        />
                        <Select
                          compact
                          label={t("bills.type")}
                          name={`feeType${index}`}
                          onValueChange={(value) => {
                            const nextFeeType = Number(value) as FeeType;
                            setFees((current) =>
                              current.map((entry, feeIndex) =>
                                feeIndex === index
                                  ? {
                                      ...entry,
                                      feeType: nextFeeType,
                                      value: nextFeeType === FEE_TYPE.percentage && Number(entry.value) < 0 ? "" : entry.value,
                                    }
                                  : entry
                              )
                            );
                          }}
                          options={feeTypeOptions}
                          value={String(fee.feeType)}
                        />
                        <input
                          aria-label={t("bills.value")}
                          className={compactInputClassName}
                          min={fee.feeType === FEE_TYPE.percentage ? "0" : undefined}
                          name={`feeValue${index}`}
                          onChange={(event) => setFees((current) => current.map((entry, feeIndex) => feeIndex === index ? { ...entry, value: event.target.value } : entry))}
                          required
                          step="0.01"
                          type="number"
                          value={fee.value}
                        />
                        <Button
                          aria-label={t("common.remove")}
                          className="size-10 px-0 text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setFees((current) => current.filter((_, feeIndex) => feeIndex !== index))}
                          title={t("common.remove")}
                          variant="secondary"
                        >
                          <Trash2Icon aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  compact
                  description={t("bills.emptyFeesBody")}
                  icon={<PercentIcon aria-hidden="true" className="size-5" />}
                  title={t("bills.emptyFeesTitle")}
                />
              )}
            </div>
          </section>

          <aside className="lg:sticky lg:top-0 lg:self-start">
            <BillSummaryPanel bill={previewBill} participants={participants} />
          </aside>
        </div>
      </div>

      <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 border-t border-[var(--splity-line)] bg-white pt-4">
        <p className="grid text-xs font-bold text-[var(--splity-muted)]">
          {t("bills.total")}
          <span className="splity-display text-xl font-extrabold text-[#087f6f]">
            {money(previewBill.grandTotalAmount, previewBill.currencyCode)}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <CancelButton cancelHref={cancelHref} onCancel={onCancel} />
          <SubmitButton disabled={disabled} />
        </div>
      </div>
    </form>
  );
}
