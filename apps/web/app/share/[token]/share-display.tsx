"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import {
  CheckCircle2,
  CreditCard,
  ImagePlus,
  ReceiptText,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { useTranslation, type MessageKey } from "@/lib/i18n";
import type { PublicSettlementShare } from "@/lib/services/settlement-shares";
import {
  confirmPublicShareTransferAction,
  type PublicShareActionState,
} from "./actions";

type ShareDisplayProps = {
  share: PublicSettlementShare;
};

type SelectedIdentity = {
  id: string;
  name: string;
};

type PaymentInfo = {
  accountName: string;
  accountNumber: string;
  notes: string;
  paymentMethod: string;
  paymentQrDataUrl: string;
  receiverName: string;
};

const initialActionState: PublicShareActionState = {
  error: null,
  success: null,
};

function formatDate(value: string | null, fallback: string) {
  return value ? new Date(value).toLocaleDateString() : fallback;
}

function formatMessage(
  t: (key: MessageKey) => string,
  key: MessageKey,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    t(key)
  );
}

function money(amount: string, currencyCode = "MYR") {
  return `${currencyCode} ${Number(amount).toFixed(2)}`;
}

function statusTone(status: number) {
  if (status === 2) return "green";
  if (status === 1) return "amber";
  return "neutral";
}

function uniqueIdentities(share: PublicSettlementShare) {
  const map = new Map<string, string>();

  share.participants.forEach((participant) => map.set(participant.id, participant.name));
  share.transfers.forEach((transfer) => {
    if (transfer.from_participant_id) map.set(transfer.from_participant_id, transfer.from_name);
    if (transfer.to_participant_id) map.set(transfer.to_participant_id, transfer.to_name);
  });

  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

function roleForIdentity(share: PublicSettlementShare, participantId: string): MessageKey {
  const pays = share.transfers.some((transfer) => transfer.from_participant_id === participantId);
  const receives = share.transfers.some((transfer) => transfer.to_participant_id === participantId);
  if (pays && receives) return "share.roleBoth";
  if (pays) return "settlements.role.payer";
  if (receives) return "settlements.role.receiver";
  return "settlements.role.balanced";
}

function roleClasses(roleKey: MessageKey) {
  if (roleKey === "settlements.role.payer") {
    return {
      accent: "bg-red-500",
      card: "border-red-200 bg-red-50/60",
      chip: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (roleKey === "settlements.role.receiver") {
    return {
      accent: "bg-cyan-500",
      card: "border-cyan-200 bg-cyan-50/60",
      chip: "border-cyan-200 bg-cyan-50 text-cyan-700",
    };
  }

  if (roleKey === "share.roleBoth") {
    return {
      accent: "bg-[var(--splity-gold-strong)]",
      card: "border-amber-200 bg-amber-50/70",
      chip: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  return {
    accent: "bg-[var(--splity-muted)]",
    card: "border-[var(--splity-line)] bg-white",
    chip: "border-[var(--splity-line)] bg-[var(--splity-bg)] text-[var(--splity-muted)]",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseReceiverPaymentInfos(value: string | null) {
  if (!value) return new Map<string, PaymentInfo>();

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return new Map<string, PaymentInfo>();

    const entries: [string, PaymentInfo][] = [];
    parsed.filter(isRecord).forEach((item) => {
      const participantId = textValue(item.participantId);
      if (!participantId) return;

      entries.push([
        participantId,
        {
          accountName: textValue(item.accountName),
          accountNumber: textValue(item.accountNumber),
          notes: textValue(item.notes),
          paymentMethod: textValue(item.paymentMethod),
          paymentQrDataUrl: textValue(item.paymentQrDataUrl),
          receiverName: textValue(item.receiverName),
        },
      ]);
    });

    return new Map(entries);
  } catch {
    return new Map<string, PaymentInfo>();
  }
}

function fallbackPaymentInfo(share: PublicSettlementShare): PaymentInfo {
  return {
    accountName: share.account_name ?? "",
    accountNumber: share.account_number ?? "",
    notes: share.notes ?? "",
    paymentMethod: share.payment_method ?? "",
    paymentQrDataUrl: share.payment_qr_data_url ?? "",
    receiverName: share.payee_name ?? "",
  };
}

export function ShareDisplay({ share }: ShareDisplayProps) {
  const identities = useMemo(() => uniqueIdentities(share), [share]);
  const receiverInfoByParticipant = useMemo(
    () => parseReceiverPaymentInfos(share.receiver_payment_infos_json),
    [share.receiver_payment_infos_json]
  );
  const defaultPaymentInfo = useMemo(() => fallbackPaymentInfo(share), [share]);
  const [selectedIdentity, setSelectedIdentity] = useState<SelectedIdentity | null>(null);
  const { t } = useTranslation();
  const currencyCode = share.bills[0]?.currency_code ?? "MYR";

  const selectedBills = useMemo(() => {
    if (!selectedIdentity) return [];
    return share.bills.filter((bill) => {
      const hasShare = bill.shares.some((item) => item.participant_id === selectedIdentity.id);
      const hasItem = bill.items.some((item) =>
        item.responsible_participant_ids.includes(selectedIdentity.id)
      );
      return hasShare || hasItem || bill.primary_payer_participant_id === selectedIdentity.id;
    });
  }, [selectedIdentity, share.bills]);

  const selectedTransfers = useMemo(() => {
    if (!selectedIdentity) return [];
    return share.transfers.filter(
      (transfer) =>
        transfer.from_participant_id === selectedIdentity.id ||
        transfer.to_participant_id === selectedIdentity.id
    );
  }, [selectedIdentity, share.transfers]);

  return (
    <div className="grid gap-5">
      <StepHeader activeStep={selectedIdentity ? 3 : 1} />

      <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:p-6">
        <SectionHeading
          body={t("share.chooseIdentityBody")}
          icon={<UserRound className="h-5 w-5" />}
          title={t("share.chooseIdentity")}
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {identities.map((identity) => {
            const selected = selectedIdentity?.id === identity.id;
            const roleKey = roleForIdentity(share, identity.id);
            const tone = roleClasses(roleKey);

            return (
              <button
                className={[
                  "relative min-h-[104px] overflow-hidden rounded-xl border p-4 text-left transition-colors",
                  selected
                    ? "border-[var(--splity-navy)] bg-[var(--splity-bg)]"
                    : `${tone.card} hover:border-[var(--splity-line-strong)]`,
                ].join(" ")}
                key={identity.id}
                onClick={() => setSelectedIdentity(identity)}
                type="button"
              >
                <span className={`absolute inset-y-0 left-0 w-1.5 ${tone.accent}`} />
                <span className="flex items-start justify-between gap-3 pl-2">
                  <span>
                    <span className="block text-base font-extrabold text-[var(--splity-ink)]">
                      {identity.name}
                    </span>
                    <span
                      className={[
                        "mt-3 inline-flex h-7 items-center rounded-md border px-2 text-xs font-bold",
                        tone.chip,
                      ].join(" ")}
                    >
                      {t(roleKey)}
                    </span>
                  </span>
                  {selected ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--splity-navy)]" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedIdentity ? (
        <>
          <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:p-6">
            <SectionHeading
              body={formatMessage(t, "share.checkBillsBody", { name: selectedIdentity.name })}
              icon={<ReceiptText className="h-5 w-5" />}
              tone="gold"
              title={t("share.checkBills")}
            />

            <div className="mt-5 grid gap-3">
              {selectedBills.length ? (
                selectedBills.map((bill) => {
                  const selectedShare = bill.shares.find(
                    (shareItem) => shareItem.participant_id === selectedIdentity.id
                  );

                  return (
                    <article
                      className="rounded-xl border border-[var(--splity-line)] bg-[var(--splity-bg)] p-4"
                      key={bill.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-extrabold text-[var(--splity-ink)]">
                            {bill.store_name}
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-[var(--splity-muted)]">
                            {formatDate(bill.transaction_date_utc, t("share.anyTime"))} ·{" "}
                            {t("bills.paidByShort")}: {bill.payer_name}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-semibold text-[var(--splity-muted)]">
                            {t("bills.grandTotal")}
                          </p>
                          <p className="font-mono text-lg font-extrabold text-[var(--splity-ink)]">
                            {money(bill.grand_total_amount, bill.currency_code)}
                          </p>
                        </div>
                      </div>

                      {selectedShare ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-200 bg-white px-3 py-2">
                          <span className="text-sm font-bold text-cyan-800">
                            {selectedIdentity.name} · {t("settlements.participantShare")}
                          </span>
                          <span className="font-mono text-sm font-extrabold text-cyan-900">
                            {money(selectedShare.total_share_amount, bill.currency_code)}
                          </span>
                        </div>
                      ) : null}

                      <div className="mt-3 grid gap-2">
                        {bill.items.map((item) => {
                          const involved = item.responsible_participant_ids.includes(
                            selectedIdentity.id
                          );

                          return (
                            <div
                              className={[
                                "rounded-lg border bg-white px-3 py-2 text-sm",
                                involved
                                  ? "border-cyan-200"
                                  : "border-[var(--splity-line)] opacity-70",
                              ].join(" ")}
                              key={item.id}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-[var(--splity-ink)]">
                                  {item.description}
                                </span>
                                <span className="font-mono font-extrabold text-[var(--splity-ink)]">
                                  {money(item.amount, bill.currency_code)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-[var(--splity-muted)]">
                                {t("bills.responsibleParticipants")}:{" "}
                                {item.responsible_participant_names.join(", ") || t("bills.none")}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })
              ) : (
                <EmptyState>{t("share.noBillsForIdentity")}</EmptyState>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:p-6">
            <SectionHeading
              body={t("share.confirmPaymentBody")}
              icon={<ShieldCheck className="h-5 w-5" />}
              tone="cyan"
              title={t("share.confirmPayment")}
            />

            <div className="mt-5 grid gap-3">
              {selectedTransfers.length ? (
                selectedTransfers.map((transfer) => (
                  <TransferConfirmationForm
                    currencyCode={currencyCode}
                    identity={selectedIdentity}
                    key={transfer.transfer_key}
                    paymentInfo={
                      receiverInfoByParticipant.get(transfer.to_participant_id) ?? defaultPaymentInfo
                    }
                    shareToken={share.share_token}
                    transfer={transfer}
                  />
                ))
              ) : (
                <EmptyState>{t("share.noSettlementTransfers")}</EmptyState>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function SectionHeading({
  body,
  icon,
  title,
  tone = "navy",
}: {
  body: string;
  icon: ReactNode;
  title: string;
  tone?: "navy" | "gold" | "cyan";
}) {
  const toneClass =
    tone === "gold"
      ? "bg-amber-50 text-amber-800"
      : tone === "cyan"
        ? "bg-cyan-50 text-cyan-800"
        : "bg-[var(--splity-navy)] text-white";

  return (
    <div className="flex items-start gap-3">
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        {icon}
      </span>
      <div>
        <h2 className="text-lg font-extrabold text-[var(--splity-ink)]">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm font-medium text-[var(--splity-muted)]">{body}</p>
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--splity-line-strong)] bg-[var(--splity-bg)] p-5 text-center text-sm font-semibold text-[var(--splity-muted)]">
      {children}
    </div>
  );
}

function StepHeader({ activeStep }: { activeStep: number }) {
  const { t } = useTranslation();
  const steps = ["share.step.identity", "share.step.bills", "share.step.confirm"] as const;

  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--splity-line)] bg-white p-2 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:grid-cols-3">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const active = stepNumber <= activeStep;
        return (
          <div
            className={[
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-extrabold transition-colors",
              active
                ? "bg-[var(--splity-navy)] text-white"
                : "bg-[var(--splity-bg)] text-[var(--splity-muted)]",
            ].join(" ")}
            key={step}
          >
            <span
              className={[
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs",
                active ? "bg-white/15 text-white" : "bg-white text-[var(--splity-muted)]",
              ].join(" ")}
            >
              {stepNumber}
            </span>
            <span>{t(step)}</span>
          </div>
        );
      })}
    </div>
  );
}

function TransferConfirmationForm({
  currencyCode,
  identity,
  paymentInfo,
  shareToken,
  transfer,
}: {
  currencyCode: string;
  identity: SelectedIdentity;
  paymentInfo: PaymentInfo;
  shareToken: string;
  transfer: PublicSettlementShare["transfers"][number];
}) {
  const [state, formAction] = useActionState<PublicShareActionState, FormData>(
    confirmPublicShareTransferAction,
    initialActionState
  );
  const [proofDataUrl, setProofDataUrl] = useState("");
  const [includeProof, setIncludeProof] = useState(false);
  const [localStatus, setLocalStatus] = useState(transfer.status);
  const { t } = useTranslation();
  const isPayer = transfer.from_participant_id === identity.id;
  const action = isPayer ? "mark_paid" : "mark_received";
  const otherName = isPayer ? transfer.to_name : transfer.from_name;
  const actionComplete = isPayer ? localStatus >= 1 : localStatus >= 2;
  const canReceive = isPayer || localStatus >= 1;

  useEffect(() => {
    if (state.success) {
      setLocalStatus(isPayer ? 1 : 2);
      setIncludeProof(false);
      setProofDataUrl("");
      toast.success(state.success);
    }
    if (state.error) toast.error(state.error);
  }, [isPayer, state.error, state.success]);

  async function handleFileSelected(file: File | undefined) {
    if (!file) {
      setProofDataUrl("");
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error(t("settlements.proofTypeError"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("settlements.proofSizeError"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setProofDataUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  return (
    <form
      action={formAction}
      className={[
        "rounded-xl border bg-[var(--splity-bg)] p-4",
        isPayer ? "border-red-200" : "border-cyan-200",
      ].join(" ")}
    >
      <input name="action" type="hidden" value={action} />
      <input name="amount" type="hidden" value={transfer.amount} />
      <input name="fromParticipantId" type="hidden" value={transfer.from_participant_id} />
      <input name="proofScreenshotDataUrl" type="hidden" value={includeProof ? proofDataUrl : ""} />
      <input name="toParticipantId" type="hidden" value={transfer.to_participant_id} />
      <input name="token" type="hidden" value={shareToken} />
      <input name="transferKey" type="hidden" value={transfer.transfer_key} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-extrabold text-[var(--splity-ink)]">
            {isPayer
              ? formatMessage(t, "share.youPayTo", { name: otherName })
              : formatMessage(t, "share.youReceiveFrom", { name: otherName })}
          </p>
          <p className="mt-1 font-mono text-2xl font-extrabold text-[var(--splity-ink)]">
            {money(transfer.amount, currencyCode)}
          </p>
        </div>
        <Badge tone={statusTone(localStatus)}>{statusLabel(localStatus, t)}</Badge>
      </div>

      {isPayer ? <PaymentDetails paymentInfo={paymentInfo} /> : null}

      {isPayer && !actionComplete ? (
        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-[var(--splity-muted)]">
          <input
            checked={includeProof}
            className="h-4 w-4 accent-[var(--splity-navy)]"
            onChange={(event) => setIncludeProof(event.target.checked)}
            type="checkbox"
          />
          {t("share.includeProof")}
        </label>
      ) : null}

      {isPayer && includeProof && !actionComplete ? (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--splity-line-strong)] bg-white p-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[var(--splity-ink)]">
            <ImagePlus className="h-4 w-4" />
            {t("share.uploadProof")}
            <input
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => handleFileSelected(event.target.files?.[0])}
              type="file"
            />
          </label>
          {proofDataUrl ? (
            <img
              alt={t("settlements.proofScreenshot")}
              className="mt-3 max-h-48 rounded-lg border border-[var(--splity-line)] object-contain"
              src={proofDataUrl}
            />
          ) : null}
        </div>
      ) : null}

      {!isPayer && transfer.proof_screenshot_data_url ? (
        <img
          alt={t("settlements.proofScreenshot")}
          className="mt-4 max-h-56 rounded-lg border border-[var(--splity-line)] bg-white object-contain"
          src={transfer.proof_screenshot_data_url}
        />
      ) : null}

      {!canReceive && !isPayer ? (
        <p className="mt-3 text-sm font-semibold text-[var(--splity-muted)]">
          {t("share.markPaidFirst")}
        </p>
      ) : null}

      {!actionComplete ? (
        <div className="mt-4 flex justify-end">
          <SubmitButton
            disabled={!canReceive}
            label={isPayer ? t("share.markPaid") : t("share.markReceived")}
          />
        </div>
      ) : null}
    </form>
  );
}

function PaymentDetails({ paymentInfo }: { paymentInfo: PaymentInfo }) {
  const { t } = useTranslation();
  const rows = [
    { label: t("share.payee"), value: paymentInfo.receiverName },
    { label: t("settings.paymentMethod"), value: paymentInfo.paymentMethod },
    { label: t("settings.accountName"), value: paymentInfo.accountName },
    { label: t("settings.accountNumber"), value: paymentInfo.accountNumber },
    { label: t("settings.notes"), value: paymentInfo.notes },
  ].filter((row) => row.value);
  const hasDetails = rows.length || paymentInfo.paymentQrDataUrl;

  if (!hasDetails) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-[var(--splity-line-strong)] bg-white p-3 text-sm font-semibold text-[var(--splity-muted)]">
        {t("share.paymentUnavailable")}
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-[var(--splity-line)] bg-white p-3 sm:grid-cols-[1fr_auto]">
      <div className="grid gap-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--splity-ink)]">
          <CreditCard className="h-4 w-4 text-[var(--splity-navy)]" />
          {t("share.payTo")}
        </div>
        <div className="grid gap-2">
          {rows.map((row) => (
            <div className="grid gap-1 sm:grid-cols-[150px_1fr]" key={row.label}>
              <span className="text-xs font-semibold text-[var(--splity-muted)]">{row.label}</span>
              <span className="break-words text-sm font-bold text-[var(--splity-ink)]">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {paymentInfo.paymentQrDataUrl ? (
        <img
          alt={t("share.paymentQrAlt")}
          className="h-28 w-28 rounded-lg border border-[var(--splity-line)] object-contain"
          src={paymentInfo.paymentQrDataUrl}
        />
      ) : (
        <div className="hidden h-28 w-28 items-center justify-center rounded-lg border border-dashed border-[var(--splity-line-strong)] text-[var(--splity-muted)] sm:flex">
          <WalletCards className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

function SubmitButton({ disabled, label }: { disabled: boolean; label: string }) {
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
    <button
      className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--splity-navy)] px-4 text-sm font-extrabold text-white transition-colors hover:bg-[var(--splity-ink)] disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? t("common.saving") : label}
    </button>
  );
}

function statusLabel(status: number, t: (key: MessageKey) => string) {
  if (status === 2) return t("settlements.status.received");
  if (status === 1) return t("settlements.status.markedPaid");
  return t("settlements.status.pending");
}
