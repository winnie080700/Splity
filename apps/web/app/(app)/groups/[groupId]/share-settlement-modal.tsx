"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import type { ActiveSettlementShare } from "@/lib/services/settlement-shares";
import {
  createShareAction,
  regenerateShareAction,
  type ShareActionState,
} from "./share/actions";

export type SettlementReceiverInfo = {
  accountName: string;
  accountNumber: string;
  incomingCount: number;
  locked: boolean;
  notes: string;
  paidCount: number;
  participantId: string;
  paymentMethod: string;
  paymentQrDataUrl: string;
  receiverName: string;
};

type ShareSettlementModalProps = {
  activeShare: ActiveSettlementShare | null;
  closeHref: string;
  groupId: string;
  open: boolean;
  receivers: SettlementReceiverInfo[];
};

const initialState: ShareActionState = { error: null, success: null };

function SubmitButton({ activeShare }: { activeShare: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();

  return (
    <button
      className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--splity-navy)] px-4 text-sm font-bold text-white transition hover:bg-[#15225a] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending
        ? t("common.saving")
        : activeShare
          ? t("share.regenerate")
          : t("share.saveAndGenerate")}
    </button>
  );
}

export function ShareSettlementModal({
  activeShare,
  closeHref,
  groupId,
  open,
  receivers,
}: ShareSettlementModalProps) {
  const action = activeShare ? regenerateShareAction : createShareAction;
  const [state, formAction] = useActionState(action.bind(null, groupId), initialState);
  const [receiverState, setReceiverState] = useState(receivers);
  const [existingUrl, setExistingUrl] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    setReceiverState(receivers);
  }, [receivers]);

  useEffect(() => {
    setExistingUrl(activeShare ? `${window.location.origin}/share/${activeShare.shareToken}` : "");
  }, [activeShare]);

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state.error, state.success]);

  const receiverPaymentInfosJson = useMemo(
    () =>
      JSON.stringify(
        receiverState.map((receiver) => ({
          accountName: receiver.accountName,
          accountNumber: receiver.accountNumber,
          locked: receiver.locked,
          notes: receiver.notes,
          participantId: receiver.participantId,
          paymentMethod: receiver.paymentMethod,
          paymentQrDataUrl: receiver.paymentQrDataUrl,
          receiverName: receiver.receiverName,
        }))
      ),
    [receiverState]
  );

  if (!open) return null;

  function updateReceiver(
    participantId: string,
    field: keyof SettlementReceiverInfo,
    value: string
  ) {
    setReceiverState((current) =>
      current.map((receiver) =>
        receiver.participantId === participantId
          ? { ...receiver, [field]: value }
          : receiver
      )
    );
  }

  const firstReceiver = receiverState[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(12,21,56,0.36)] px-4 py-6 backdrop-blur-sm splity-modal-backdrop">
      <div className="mx-auto w-full max-w-4xl rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_28px_100px_rgba(12,21,56,0.32)] splity-modal-panel sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--splity-line)] pb-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
              {t("groupDetail.settlementPlan")}
            </p>
            <h2 className="splity-display mt-1 text-3xl font-extrabold text-[var(--splity-ink)]">
              {t("groupDetail.shareSettlement")}
            </h2>
          </div>
          <Link
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/45 text-[var(--splity-muted)] transition hover:bg-white"
            href={closeHref}
          >
            <span className="sr-only">{t("common.close")}</span>
            <X className="h-4 w-4" />
          </Link>
        </div>

        {activeShare ? (
          <div className="mb-5 rounded-2xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/35 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
              {t("share.currentLink")}
            </p>
            <div className="mt-2 break-all rounded-xl bg-white px-3 py-2 text-sm font-bold text-[var(--splity-ink)]">
              {existingUrl}
            </div>
            <p className="mt-2 text-xs font-semibold text-[var(--splity-muted)]">
              {t("share.regenerateHint")}
            </p>
          </div>
        ) : null}

        <form
          action={formAction}
          className="grid gap-4"
          onSubmit={() => toast.loading(t("common.saving"))}
        >
          <input name="receiverPaymentInfosJson" type="hidden" value={receiverPaymentInfosJson} />
          <input name="creatorName" type="hidden" value="" />
          <input name="payeeName" type="hidden" value={firstReceiver?.receiverName ?? ""} />
          <input name="paymentMethod" type="hidden" value={firstReceiver?.paymentMethod ?? ""} />
          <input name="accountName" type="hidden" value={firstReceiver?.accountName ?? ""} />
          <input name="accountNumber" type="hidden" value={firstReceiver?.accountNumber ?? ""} />
          <input name="paymentQrDataUrl" type="hidden" value={firstReceiver?.paymentQrDataUrl ?? ""} />
          <input name="notes" type="hidden" value={firstReceiver?.notes ?? ""} />

          <div className="grid gap-3">
            {receiverState.map((receiver) => {
              const locked = receiver.locked;
              return (
                <section
                  className="rounded-2xl border border-[var(--splity-line)] bg-white p-4"
                  key={receiver.participantId}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-[var(--splity-ink)]">
                        {receiver.receiverName}
                      </h3>
                      <p className="text-xs font-semibold text-[var(--splity-muted)]">
                        {locked
                          ? t("share.invitedReceiverLocked")
                          : t("share.manualReceiverEditable")}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-[var(--splity-gold-strong)]">
                      {t("share.paymentProgress")
                        .replace("{paid}", String(receiver.paidCount))
                        .replace("{total}", String(receiver.incomingCount))}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Input
                      disabled={locked}
                      label={t("settings.payeeName")}
                      name={`receiverName-${receiver.participantId}`}
                      onChange={(event) => updateReceiver(receiver.participantId, "receiverName", event.target.value)}
                      value={receiver.receiverName}
                    />
                    <Input
                      disabled={locked}
                      label={t("settings.paymentMethod")}
                      name={`paymentMethod-${receiver.participantId}`}
                      onChange={(event) => updateReceiver(receiver.participantId, "paymentMethod", event.target.value)}
                      value={receiver.paymentMethod}
                    />
                    <Input
                      disabled={locked}
                      label={t("settings.accountName")}
                      name={`accountName-${receiver.participantId}`}
                      onChange={(event) => updateReceiver(receiver.participantId, "accountName", event.target.value)}
                      value={receiver.accountName}
                    />
                    <Input
                      disabled={locked}
                      label={t("settings.accountNumber")}
                      name={`accountNumber-${receiver.participantId}`}
                      onChange={(event) => updateReceiver(receiver.participantId, "accountNumber", event.target.value)}
                      value={receiver.accountNumber}
                    />
                  </div>
                </section>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--splity-line)] pt-4">
            <SubmitButton activeShare={Boolean(activeShare)} />
          </div>
        </form>
      </div>
    </div>
  );
}
