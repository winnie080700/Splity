"use client";

import { MinusIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { clearRouteSuccess, queueRouteSuccess } from "@/components/ui/route-toast";
import { Select } from "@/components/ui/select";
import { calculateBillShares } from "@/lib/calculations/bill-calculator";
import { FEE_TYPE, SPLIT_MODE, type FeeType, type SplitMode } from "@/lib/calculations/types";
import { useTranslation } from "@/lib/i18n";
import type { BillActionState } from "./actions";
import type { BillDetail } from "@/lib/calculations/bill-read-projection";
import type { Participant } from "@/lib/services/participants";
import { BillPreview, type BillPreviewData } from "./bill-preview";

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

type FormContribution = {
  participantId: string;
  amount: string;
};

type BillFormProps = {
  action: (prevState: BillActionState, formData: FormData) => Promise<BillActionState>;
  canEdit: boolean;
  initialBill?: BillDetail;
  participants: Participant[];
};

const initialState: BillActionState = { error: null };

function toDateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

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
    <Button className="gap-2" disabled={disabled || pending} type="submit">
      {pending ? <><Spinner />{t("common.saving")}</> : t("bills.saveBill")}
    </Button>
  );
}

export function BillForm({
  action,
  canEdit,
  initialBill,
  participants,
}: BillFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const { t } = useTranslation();
  const firstParticipantId = participants[0]?.id ?? "";
  const [storeName, setStoreName] = useState(initialBill?.storeName ?? "");
  const [date, setDate] = useState(toDateInput(initialBill?.transactionDateUtc));
  const [primaryPayerParticipantId, setPrimaryPayerParticipantId] = useState(
    initialBill?.primaryPayerParticipantId ?? firstParticipantId
  );
  const [splitMode, setSplitMode] = useState<SplitMode>(initialBill?.splitMode ?? SPLIT_MODE.equal);
  const [items, setItems] = useState<FormItem[]>(
    initialBill?.items.length
      ? initialBill.items
      : [{ description: "", amount: "0.00", responsibleParticipantIds: participants.map((p) => p.id) }]
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
  const [contributions, setContributions] = useState<FormContribution[]>(
    initialBill?.contributions
      .filter((contribution) => contribution.amount !== "0.00")
      .map((contribution) => ({ participantId: contribution.participantId, amount: contribution.amount })) ?? []
  );

  const participantOptions = participants.map((participant) => ({
    label: participant.name,
    value: participant.id,
  }));
  const feeTypeOptions = [
    { label: t("bills.percent"), value: String(FEE_TYPE.percentage) },
    { label: t("bills.fixed"), value: String(FEE_TYPE.fixed) },
  ];
  const compactInputClassName =
    "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10";
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
        extraContributions: contributions.filter((contribution) => Number(contribution.amount) > 0),
      }),
    [storeName, date, splitMode, primaryPayerParticipantId, participants, weights, items, fees, contributions]
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
  const activeContributions = useMemo(
    () => contributions.filter((contribution) => Number(contribution.amount) > 0),
    [contributions]
  );
  const previewBill = useMemo<BillPreviewData>(() => {
    try {
      const result = calculateBillShares({
        participantSplits,
        items,
        fees,
        primaryPayerParticipantId,
        extraContributions: activeContributions,
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
        items: items.map((item, index) => ({
          id: item.id ?? `preview-${index}`,
          description: item.description,
          amount: Number(item.amount || 0).toFixed(2),
          responsibleParticipantIds: item.responsibleParticipantIds,
        })),
      };
    }
  }, [
    activeContributions,
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
      className="grid gap-5"
      onSubmit={() => queueRouteSuccess("bills.saved")}
    >
      <input name="payload" type="hidden" value={payload} />
      <Alert tone="error">{state.error}</Alert>
      {!canEdit ? <Alert tone="info">{t("bills.groupLocked")}</Alert> : null}
      {participants.length === 0 ? <Alert tone="error">{t("bills.needParticipant")}</Alert> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid max-h-[72vh] gap-3 overflow-y-auto pr-1">
          <section className="grid gap-3 rounded-2xl border border-[var(--splity-line)] bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label={t("bills.storeName")} name="storeNameView" onChange={(e) => setStoreName(e.target.value)} required value={storeName} />
              <Input label={t("bills.date")} name="dateView" onChange={(e) => setDate(e.target.value)} required type="date" value={date} />
              <label className="grid gap-2 text-sm font-medium text-zinc-800">
                <span>{t("bills.primaryPayer")}</span>
                <select
                  className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 shadow-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                  onChange={(event) => setPrimaryPayerParticipantId(event.target.value)}
                  value={primaryPayerParticipantId}
                >
                  {participantOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-800">
                <span>{t("bills.splitMode")}</span>
                <select
                  className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 shadow-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                  onChange={(event) => setSplitMode(Number(event.target.value) as SplitMode)}
                  value={splitMode}
                >
                  <option value={SPLIT_MODE.equal}>{t("bills.equal")}</option>
                  <option value={SPLIT_MODE.weighted}>{t("bills.weighted")}</option>
                </select>
              </label>
            </div>
          </section>

          <section className="grid gap-3 rounded-xl border border-[var(--splity-line)] bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-extrabold text-[var(--splity-ink)]">{t("bills.items")}</h3>
              <Button
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    { description: "", amount: "0.00", responsibleParticipantIds: participants.map((p) => p.id) },
                  ])
                }
                className="h-10"
                variant="secondary"
              >
                {t("bills.addItem")}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[720px] gap-2">
                <div className="grid grid-cols-[minmax(0,6fr)_minmax(96px,2fr)_minmax(150px,3fr)_44px] items-center gap-2">
                  <span className={tableHeaderClassName}>{t("bills.description")}</span>
                  <span className={tableHeaderClassName}>{t("bills.amount")}</span>
                  <span className={tableHeaderClassName}>{t("bills.participant")}</span>
                  <span className="sr-only">{t("common.remove")}</span>
                </div>
                {items.map((item, index) => (
                  <div
                    className="grid grid-cols-[minmax(0,6fr)_minmax(96px,2fr)_minmax(150px,3fr)_44px] items-center gap-2"
                    key={item.id ?? index}
                  >
                    <input
                      aria-label={t("bills.description")}
                      className={compactInputClassName}
                      name={`itemDescription${index}`}
                      onChange={(event) =>
                        setItems((current) => current.map((x, i) => (i === index ? { ...x, description: event.target.value } : x)))
                      }
                      value={item.description}
                    />
                    <input
                      aria-label={t("bills.amount")}
                      className={compactInputClassName}
                      min="0"
                      name={`itemAmount${index}`}
                      onChange={(event) =>
                        setItems((current) => current.map((x, i) => (i === index ? { ...x, amount: event.target.value } : x)))
                      }
                      step="0.01"
                      type="number"
                      value={item.amount}
                    />
                    <MultiSelect
                      compact
                      label={t("bills.participant")}
                      name={`itemParticipant${index}`}
                      onValueChange={(value) =>
                        setItems((current) =>
                          current.map((x, i) => (i === index ? { ...x, responsibleParticipantIds: value } : x))
                        )
                      }
                      options={participantOptions}
                      placeholder={t("bills.none")}
                      value={item.responsibleParticipantIds}
                    />
                    <Button
                      aria-label={t("common.remove")}
                      className="h-10 w-10 px-0"
                      disabled={items.length === 1}
                      onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                      title={t("common.remove")}
                      variant="ghost"
                    >
                      <MinusIcon aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {splitMode === SPLIT_MODE.weighted ? (
            <section className="grid gap-3 rounded-2xl border border-[var(--splity-line)] bg-white p-4">
              <h3 className="font-extrabold text-[var(--splity-ink)]">{t("bills.weight")}</h3>
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
            </section>
          ) : null}

          <section className="grid gap-3 rounded-xl border border-[var(--splity-line)] bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-extrabold text-[var(--splity-ink)]">{t("bills.fees")}</h3>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  className="h-10"
                  onClick={() => setFees((current) => [...current, { name: t("bills.discount"), feeType: FEE_TYPE.fixed, value: "-0.00" }])}
                  variant="secondary"
                >
                  {t("bills.addDiscount")}
                </Button>
                <Button className="h-10" onClick={() => setFees((current) => [...current, { name: "", feeType: FEE_TYPE.percentage, value: "0.00" }])} variant="secondary">
                  {t("bills.addFee")}
                </Button>
              </div>
            </div>
            {fees.length ? (
              <div className="overflow-x-auto">
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
                        onChange={(event) => setFees((current) => current.map((x, i) => (i === index ? { ...x, name: event.target.value } : x)))}
                        value={fee.name}
                      />
                      <Select
                        compact
                        label={t("bills.type")}
                        name={`feeType${index}`}
                        onValueChange={(value) => {
                          const nextFeeType = Number(value) as FeeType;
                          setFees((current) =>
                            current.map((x, i) =>
                              i === index
                                ? {
                                    ...x,
                                    feeType: nextFeeType,
                                    value: nextFeeType === FEE_TYPE.percentage && Number(x.value) < 0 ? "0.00" : x.value,
                                  }
                                : x
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
                        onChange={(event) => setFees((current) => current.map((x, i) => (i === index ? { ...x, value: event.target.value } : x)))}
                        step="0.01"
                        type="number"
                        value={fee.value}
                      />
                      <Button
                        aria-label={t("common.remove")}
                        className="h-10 w-10 px-0"
                        onClick={() => setFees((current) => current.filter((_, i) => i !== index))}
                        title={t("common.remove")}
                        variant="ghost"
                      >
                        <MinusIcon aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="grid gap-3 rounded-2xl border border-[var(--splity-line)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-extrabold text-[var(--splity-ink)]">{t("bills.prePayments")}</h3>
              <Button onClick={() => setContributions((current) => [...current, { participantId: firstParticipantId, amount: "0.00" }])} variant="secondary">
                {t("bills.addContribution")}
              </Button>
            </div>
            {contributions.map((contribution, index) => (
              <div className="grid gap-3 sm:grid-cols-2" key={index}>
                <label className="grid gap-2 text-sm font-medium text-zinc-800">
                  <span>{t("bills.participant")}</span>
                  <select className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950" onChange={(event) => setContributions((current) => current.map((x, i) => (i === index ? { ...x, participantId: event.target.value } : x)))} value={contribution.participantId}>
                    {participantOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Input label={t("bills.amount")} min="0" name={`contribution${index}`} onChange={(event) => setContributions((current) => current.map((x, i) => (i === index ? { ...x, amount: event.target.value } : x)))} step="0.01" type="number" value={contribution.amount} />
                <div className="flex items-end sm:col-span-2">
                  <Button onClick={() => setContributions((current) => current.filter((_, i) => i !== index))} variant="ghost">
                    {t("common.remove")}
                  </Button>
                </div>
              </div>
            ))}
          </section>
        </div>

        <aside className="max-h-[72vh] overflow-y-auto xl:sticky xl:top-0">
          <BillPreview bill={previewBill} participants={participants} />
        </aside>
      </div>

      <div className="flex justify-end gap-3 border-t border-[var(--splity-line)] pt-4">
        <SubmitButton disabled={disabled} />
      </div>
    </form>
  );
}
