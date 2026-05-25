"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import type { ActiveSettlementShare } from "@/lib/services/settlement-shares";
import {
  createShareAction,
  deactivateShareAction,
  regenerateShareAction,
  type ShareActionState,
} from "./actions";

type ShareFormProps = {
  activeShare: ActiveSettlementShare | null;
  canGenerate: boolean;
  defaultCreatorName: string;
  defaultPayeeName: string;
  defaultPaymentMethod: string;
  defaultAccountName: string;
  defaultAccountNumber: string;
  defaultNotes: string;
  defaultPaymentQrDataUrl: string;
  groupId: string;
};

const initialState: ShareActionState = { error: null, success: null };

function SubmitButton({
  children,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();

  return (
    <Button disabled={disabled || pending} type="submit" variant={variant}>
      {pending ? t("common.saving") : children}
    </Button>
  );
}

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function ShareForm({
  activeShare,
  canGenerate,
  defaultCreatorName,
  defaultPayeeName,
  defaultPaymentMethod,
  defaultAccountName,
  defaultAccountNumber,
  defaultNotes,
  defaultPaymentQrDataUrl,
  groupId,
}: ShareFormProps) {
  const action = activeShare ? regenerateShareAction : createShareAction;
  const [state, formAction] = useActionState(action.bind(null, groupId), initialState);
  const [deactivateState, deactivateAction] = useActionState(deactivateShareAction.bind(null, groupId), initialState);
  const { t } = useTranslation();

  return (
    <div className="grid gap-4">
      <form action={formAction} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input disabled={!canGenerate} defaultValue={dateInputValue(activeShare?.fromDateUtc ?? null)} label={t("settlements.from")} name="fromDateUtc" type="date" />
          <Input disabled={!canGenerate} defaultValue={dateInputValue(activeShare?.toDateUtc ?? null)} label={t("settlements.to")} name="toDateUtc" type="date" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input disabled={!canGenerate} defaultValue={activeShare?.creatorName ?? defaultCreatorName} label={t("share.creatorName")} name="creatorName" />
          <Input disabled={!canGenerate} defaultValue={activeShare?.payeeName ?? defaultPayeeName} label={t("settings.payeeName")} name="payeeName" />
          <Input disabled={!canGenerate} defaultValue={activeShare?.paymentMethod ?? defaultPaymentMethod} label={t("settings.paymentMethod")} name="paymentMethod" />
          <Input disabled={!canGenerate} defaultValue={activeShare?.accountName ?? defaultAccountName} label={t("settings.accountName")} name="accountName" />
          <Input disabled={!canGenerate} defaultValue={activeShare?.accountNumber ?? defaultAccountNumber} label={t("settings.accountNumber")} name="accountNumber" />
          <Input
            disabled={!canGenerate}
            defaultValue={activeShare?.paymentQrDataUrl ?? defaultPaymentQrDataUrl}
            hint={t("share.paymentQrDataUrlHint")}
            label={t("share.paymentQrDataUrl")}
            name="paymentQrDataUrl"
          />
        </div>
        <label className="grid gap-2 text-sm font-medium text-zinc-800">
          <span>{t("settings.notes")}</span>
          <textarea
            className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
            defaultValue={activeShare?.notes ?? defaultNotes}
            disabled={!canGenerate}
            name="notes"
          />
        </label>
        <input
          name="receiverPaymentInfosJson"
          type="hidden"
          value={activeShare?.receiverPaymentInfosJson ?? ""}
        />
        <Alert tone="error">{state.error}</Alert>
        <Alert tone="success">{state.success}</Alert>
        {canGenerate ? (
          <div className="flex flex-wrap justify-end gap-2">
            <SubmitButton disabled={!canGenerate} variant={activeShare ? "secondary" : "primary"}>
              {activeShare ? t("share.regenerate") : t("share.saveAndGenerate")}
            </SubmitButton>
          </div>
        ) : null}
      </form>

      {activeShare ? (
        <form action={deactivateAction} className="flex justify-end">
          <div className="grid gap-2">
            <Alert tone="error">{deactivateState.error}</Alert>
            <Alert tone="success">{deactivateState.success}</Alert>
            <Button disabled={!canGenerate && !activeShare} type="submit" variant="secondary">
              {t("share.deactivate")}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
