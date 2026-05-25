"use client";

import Link from "next/link";
import { useMemo, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FEE_TYPE, SPLIT_MODE, type SplitMode } from "@/lib/calculations/types";
import { useTranslation } from "@/lib/i18n";
import type { BillActionState } from "../actions";
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
  feeType: number;
  value: string;
};

type FormContribution = {
  participantId: string;
  amount: string;
};

type BillFormProps = {
  action: (prevState: BillActionState, formData: FormData) => Promise<BillActionState>;
  canEdit: boolean;
  groupId: string;
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
  return (
    <Button disabled={disabled || pending} type="submit">
      {pending ? t("common.saving") : t("bills.saveBill")}
    </Button>
  );
}

export function BillForm({
  action,
  canEdit,
  groupId,
  initialBill,
  participants,
}: BillFormProps) {
  const [state, formAction] = useActionState(action, initialState);
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
    initialBill?.fees.map((fee) => ({ name: fee.name, feeType: fee.feeType, value: fee.value })) ?? []
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

  const disabled = !canEdit || participants.length === 0;
  const { t } = useTranslation();

  return (
    <form action={formAction} className="grid gap-6">
      <input name="payload" type="hidden" value={payload} />
      <div>
        <Link className="text-sm font-semibold text-zinc-600 underline" href={`/groups/${groupId}`}>
          {t("groups.backToGroup")}
        </Link>
      </div>
      <Alert tone="error">{state.error}</Alert>
      {!canEdit ? <Alert tone="info">{t("bills.groupLocked")}</Alert> : null}
      {participants.length === 0 ? <Alert tone="error">{t("bills.needParticipant")}</Alert> : null}

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">{initialBill ? t("bills.editBill") : t("groups.newBill")}</h1>
        <div className="grid gap-4 md:grid-cols-2">
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

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("bills.items")}</h2>
          <Button
            onClick={() =>
              setItems((current) => [
                ...current,
                { description: "", amount: "0.00", responsibleParticipantIds: participants.map((p) => p.id) },
              ])
            }
            variant="secondary"
          >
            {t("bills.addItem")}
          </Button>
        </div>
        {items.map((item, index) => (
          <div className="grid gap-3 rounded-md border border-zinc-100 p-3" key={item.id ?? index}>
            <div className="grid gap-3 md:grid-cols-[1fr_10rem_auto]">
              <Input
                label={t("bills.description")}
                name={`itemDescription${index}`}
                onChange={(event) =>
                  setItems((current) => current.map((x, i) => (i === index ? { ...x, description: event.target.value } : x)))
                }
                value={item.description}
              />
              <Input
                label={t("bills.amount")}
                min="0"
                name={`itemAmount${index}`}
                onChange={(event) =>
                  setItems((current) => current.map((x, i) => (i === index ? { ...x, amount: event.target.value } : x)))
                }
                step="0.01"
                type="number"
                value={item.amount}
              />
              <div className="flex items-end">
                <Button
                  disabled={items.length === 1}
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  variant="ghost"
                >
                  {t("common.remove")}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {participants.map((participant) => (
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700" key={participant.id}>
                  <input
                    checked={item.responsibleParticipantIds.includes(participant.id)}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((x, i) =>
                          i === index
                            ? {
                                ...x,
                                responsibleParticipantIds: event.target.checked
                                  ? [...x.responsibleParticipantIds, participant.id]
                                  : x.responsibleParticipantIds.filter((id) => id !== participant.id),
                              }
                            : x
                        )
                      )
                    }
                    type="checkbox"
                  />
                  {participant.name}
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>

      {splitMode === SPLIT_MODE.weighted ? (
        <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{t("bills.weight")}</h2>
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

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("bills.fees")}</h2>
          <Button onClick={() => setFees((current) => [...current, { name: "", feeType: FEE_TYPE.percentage, value: "0.00" }])} variant="secondary">
            {t("bills.addFee")}
          </Button>
        </div>
        {fees.map((fee, index) => (
          <div className="grid gap-3 md:grid-cols-[1fr_10rem_10rem_auto]" key={index}>
            <Input label={t("groups.name")} name={`feeName${index}`} onChange={(event) => setFees((current) => current.map((x, i) => (i === index ? { ...x, name: event.target.value } : x)))} value={fee.name} />
            <label className="grid gap-2 text-sm font-medium text-zinc-800">
              <span>{t("bills.type")}</span>
              <select className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950" onChange={(event) => setFees((current) => current.map((x, i) => (i === index ? { ...x, feeType: Number(event.target.value) } : x)))} value={fee.feeType}>
                <option value={FEE_TYPE.percentage}>{t("bills.percent")}</option>
                <option value={FEE_TYPE.fixed}>{t("bills.fixed")}</option>
              </select>
            </label>
            <Input label={t("bills.value")} min="0" name={`feeValue${index}`} onChange={(event) => setFees((current) => current.map((x, i) => (i === index ? { ...x, value: event.target.value } : x)))} step="0.01" type="number" value={fee.value} />
            <div className="flex items-end">
              <Button onClick={() => setFees((current) => current.filter((_, i) => i !== index))} variant="ghost">
                {t("common.remove")}
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("bills.prePayments")}</h2>
          <Button onClick={() => setContributions((current) => [...current, { participantId: firstParticipantId, amount: "0.00" }])} variant="secondary">
            {t("bills.addContribution")}
          </Button>
        </div>
        {contributions.map((contribution, index) => (
          <div className="grid gap-3 md:grid-cols-[1fr_10rem_auto]" key={index}>
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
            <div className="flex items-end">
              <Button onClick={() => setContributions((current) => current.filter((_, i) => i !== index))} variant="ghost">
                {t("common.remove")}
              </Button>
            </div>
          </div>
        ))}
      </section>

      <div className="flex justify-end gap-3">
        <Link className="inline-flex h-11 items-center rounded-md px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100" href={`/groups/${groupId}`}>
          {t("common.cancel")}
        </Link>
        <SubmitButton disabled={disabled} />
      </div>
    </form>
  );
}
