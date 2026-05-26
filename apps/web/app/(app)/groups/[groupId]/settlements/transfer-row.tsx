"use client";

import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import {
  SETTLEMENT_TRANSFER_STATUS,
  type SettlementTransferStatus,
} from "@/lib/domain/status";
import type { Participant } from "@/lib/services/participants";
import type { SettlementTransferDto } from "@/lib/services/settlements";
import {
  markPaidAction,
  markReceivedAction,
  type SettlementActionState,
} from "./actions";

type TransferRowProps = {
  canManage: boolean;
  fromDateUtc: string | null;
  groupId: string;
  participantLookup: Record<string, string>;
  participants: Participant[];
  statusIsSettling: boolean;
  toDateUtc: string | null;
  transfer: SettlementTransferDto;
};

const initialState: SettlementActionState = { error: null, success: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <Button disabled={pending} type="submit" variant="secondary">
      {pending ? t("common.saving") : label}
    </Button>
  );
}

function badgeTone(status: SettlementTransferStatus) {
  if (status === SETTLEMENT_TRANSFER_STATUS.received) return "green";
  if (status === SETTLEMENT_TRANSFER_STATUS.markedPaid) return "amber";
  return "neutral";
}

function HiddenTransferFields({
  fromDateUtc,
  proofScreenshotDataUrl,
  toDateUtc,
  transfer,
}: {
  fromDateUtc: string | null;
  proofScreenshotDataUrl: string;
  toDateUtc: string | null;
  transfer: SettlementTransferDto;
}) {
  return (
    <>
      <input name="fromParticipantId" type="hidden" value={transfer.fromParticipantId} />
      <input name="toParticipantId" type="hidden" value={transfer.toParticipantId} />
      <input name="amount" type="hidden" value={transfer.amount} />
      <input name="fromDateUtc" type="hidden" value={fromDateUtc ?? ""} />
      <input name="toDateUtc" type="hidden" value={toDateUtc ?? ""} />
      <input name="proofScreenshotDataUrl" type="hidden" value={proofScreenshotDataUrl} />
    </>
  );
}

export function TransferRow({
  canManage,
  fromDateUtc,
  groupId,
  participantLookup,
  participants,
  statusIsSettling,
  toDateUtc,
  transfer,
}: TransferRowProps) {
  const [proofScreenshotDataUrl, setProofScreenshotDataUrl] = useState("");
  const [proofError, setProofError] = useState<string | null>(null);
  const [paidState, paidFormAction] = useActionState(markPaidAction.bind(null, groupId), initialState);
  const [receivedState, receivedFormAction] = useActionState(markReceivedAction.bind(null, groupId), initialState);
  const fromName = participantLookup[transfer.fromParticipantId] ?? "Unknown";
  const toName = participantLookup[transfer.toParticipantId] ?? "Unknown";
  const canMarkPaid = canManage && statusIsSettling && transfer.status === SETTLEMENT_TRANSFER_STATUS.pending;
  const canMarkReceived = canManage && statusIsSettling && transfer.status === SETTLEMENT_TRANSFER_STATUS.markedPaid;
  const { t } = useTranslation();
  const statusLabel =
    transfer.status === SETTLEMENT_TRANSFER_STATUS.received
      ? t("settlements.status.received")
      : transfer.status === SETTLEMENT_TRANSFER_STATUS.markedPaid
        ? t("settlements.status.markedPaid")
        : t("settlements.status.pending");

  useEffect(() => {
    const success = paidState.success ?? receivedState.success;
    const error = proofError ?? paidState.error ?? receivedState.error;

    if (success) toast.success(success);
    if (error) toast.error(error);
  }, [paidState.error, paidState.success, proofError, receivedState.error, receivedState.success]);

  async function handleProofSelected(event: ChangeEvent<HTMLInputElement>) {
    setProofError(null);
    const file = event.target.files?.[0];
    if (!file) {
      setProofScreenshotDataUrl("");
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setProofError(t("settlements.proofTypeError"));
      setProofScreenshotDataUrl("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProofError(t("settlements.proofSizeError"));
      setProofScreenshotDataUrl("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setProofScreenshotDataUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid gap-4 border-b border-zinc-100 py-4 last:border-b-0 lg:grid-cols-[1fr_auto] lg:items-start">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-zinc-950">{fromName}</span>
          <span className="text-zinc-400">{t("settlements.toLabel")}</span>
          <span className="font-medium text-zinc-950">{toName}</span>
          <Badge tone={badgeTone(transfer.status)}>
            {statusLabel}
          </Badge>
        </div>
        <div className="text-sm text-zinc-600">
          MYR {transfer.amount}
          {transfer.markedPaidAtUtc ? ` · paid ${new Date(transfer.markedPaidAtUtc).toLocaleString()}` : ""}
          {transfer.markedReceivedAtUtc
            ? ` · received ${new Date(transfer.markedReceivedAtUtc).toLocaleString()}`
            : ""}
        </div>
        <Alert tone="error">{proofError}</Alert>
        <Alert tone="error">{paidState.error ?? receivedState.error}</Alert>
        <Alert tone="success">{paidState.success ?? receivedState.success}</Alert>
      </div>

      <div className="grid gap-3 sm:min-w-72">
        {canMarkPaid ? (
          <form action={paidFormAction} className="grid gap-3">
            <HiddenTransferFields
              fromDateUtc={fromDateUtc}
              proofScreenshotDataUrl={proofScreenshotDataUrl}
              toDateUtc={toDateUtc}
              transfer={transfer}
            />
            <Select
              defaultValue={transfer.fromParticipantId}
              label={t("settlements.actor")}
              name="actorParticipantId"
              options={participants.map((participant) => ({ label: participant.name, value: participant.id }))}
            />
            <label className="grid gap-2 text-sm font-medium text-zinc-800">
              <span>{t("settlements.proofScreenshot")}</span>
              <input accept="image/png,image/jpeg,image/webp" onChange={handleProofSelected} type="file" />
            </label>
            <SubmitButton label={t("settlements.markPaid")} />
          </form>
        ) : null}

        {canMarkReceived ? (
          <form action={receivedFormAction} className="grid gap-3">
            <HiddenTransferFields
              fromDateUtc={fromDateUtc}
              proofScreenshotDataUrl=""
              toDateUtc={toDateUtc}
              transfer={transfer}
            />
            <Select
              defaultValue={transfer.toParticipantId}
              label={t("settlements.actor")}
              name="actorParticipantId"
              options={participants.map((participant) => ({ label: participant.name, value: participant.id }))}
            />
            <SubmitButton label={t("settlements.markReceived")} />
          </form>
        ) : null}

        {!canMarkPaid && !canMarkReceived ? (
          <div className="text-right text-sm text-zinc-500">
            {transfer.status === SETTLEMENT_TRANSFER_STATUS.received ? t("settlements.complete") : t("settlements.noAction")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
