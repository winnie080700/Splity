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
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CloudUpload,
  CreditCard,
  Eye,
  FileCheck2,
  ReceiptText,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation, type MessageKey } from "@/lib/i18n";
import type { PublicSettlementShare } from "@/lib/services/settlement-shares";
import {
  confirmPublicShareTransferAction,
  type PublicShareActionState,
} from "./actions";
import {
  identitySummary,
  type Identity,
  type IdentitySummary,
} from "./share-display-utils";

type ShareDisplayProps = {
  generatedAt: string;
  share: PublicSettlementShare;
};

type PaymentInfo = {
  accountName: string;
  accountNumber: string;
  notes: string;
  paymentMethod: string;
  paymentQrDataUrl: string;
  receiverName: string;
};

type Step = 1 | 2 | 3;

const initialActionState: PublicShareActionState = { error: null, success: null };

function formatDate(value: string | null, fallback: string) {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : fallback;
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

function money(amount: string | number, currencyCode = "MYR") {
  return `${currencyCode} ${Number(amount).toFixed(2)}`;
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
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

export function ShareDisplay({ generatedAt, share }: ShareDisplayProps) {
  const { t } = useTranslation();
  const identities = useMemo(
    () => uniqueIdentities(share).map((identity) => identitySummary(share, identity)),
    [share]
  );
  const receiverInfoByParticipant = useMemo(
    () => parseReceiverPaymentInfos(share.receiver_payment_infos_json),
    [share.receiver_payment_infos_json]
  );
  const defaultPaymentInfo = useMemo(() => fallbackPaymentInfo(share), [share]);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [query, setQuery] = useState("");
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(null);
  const currencyCode = share.bills[0]?.currency_code ?? "MYR";
  const selectedIdentity =
    identities.find((identity) => identity.id === selectedIdentityId) ?? null;
  const filteredIdentities = identities.filter((identity) =>
    identity.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );

  const selectedBills = useMemo(() => {
    if (!selectedIdentityId) return [];
    return share.bills.filter((bill) => {
      const hasShare = bill.shares.some((item) => item.participant_id === selectedIdentityId);
      const hasItem = bill.items.some((item) =>
        item.responsible_participant_ids.includes(selectedIdentityId)
      );
      return hasShare || hasItem || bill.primary_payer_participant_id === selectedIdentityId;
    });
  }, [selectedIdentityId, share.bills]);

  const selectedTransfers = useMemo(
    () =>
      selectedIdentityId
        ? share.transfers.filter(
            (transfer) =>
              transfer.from_participant_id === selectedIdentityId ||
              transfer.to_participant_id === selectedIdentityId
          )
        : [],
    [selectedIdentityId, share.transfers]
  );

  function chooseIdentity(identityId: string) {
    setSelectedIdentityId(identityId);
    setCurrentStep(1);
  }

  return (
    <div className="grid gap-3 sm:gap-5">
      <StepHeader currentStep={currentStep} onStepChange={setCurrentStep} />

      {currentStep === 1 ? (
        <div className="grid gap-3 sm:gap-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(280px,1fr)]">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)] sm:rounded-3xl sm:p-7">
            <SectionHeading
              body={t("share.chooseIdentityBody")}
              icon={<UserRound className="h-6 w-6" />}
              title={t("share.chooseIdentity")}
            />

            <label className="relative mt-4 block sm:mt-6">
              <span className="sr-only">{t("share.searchParticipant")}</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("share.searchParticipant")}
                type="search"
                value={query}
              />
            </label>

            <div className="mt-4 max-h-[260px] overflow-y-auto rounded-xl border border-slate-200 sm:max-h-[350px]">
              {filteredIdentities.length ? (
                filteredIdentities.map((identity) => {
                  const selected = selectedIdentityId === identity.id;
                  return (
                    <button
                      aria-pressed={selected}
                      className={[
                        "flex min-h-16 w-full cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left outline-none transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 sm:px-4",
                        selected ? "bg-teal-50 ring-1 ring-inset ring-teal-600" : "hover:bg-slate-50",
                      ].join(" ")}
                      key={identity.id}
                      onClick={() => chooseIdentity(identity.id)}
                      type="button"
                    >
                      <Avatar name={identity.name} />
                      <span className="min-w-0 flex-1 sm:grid sm:grid-cols-[minmax(120px,1fr)_auto] sm:items-center sm:gap-3">
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-bold text-slate-900">{identity.name}</span>
                          <RoleBadge roleKey={identity.roleKey} />
                          {identity.completed ? <CompletedBadge /> : null}
                        </span>
                        <span className={[
                          "mt-1 block text-xs font-semibold sm:mt-0 sm:text-sm",
                          identity.net < 0 ? "text-red-600" : identity.net > 0 ? "text-teal-700" : "text-slate-500",
                        ].join(" ")}>
                          <BalanceLabel currencyCode={currencyCode} identity={identity} />
                        </span>
                      </span>
                      <span className={[
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                        selected ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 text-transparent",
                      ].join(" ")}>
                        <Check className="h-4 w-4" />
                      </span>
                    </button>
                  );
                })
              ) : (
                <EmptyState>
                  <p>{t("share.noParticipantMatches")}</p>
                </EmptyState>
              )}
            </div>

            <div className="mt-4 flex justify-end sm:mt-6">
              <PrimaryButton
                disabled={!selectedIdentity}
                label={t("share.continueToBills")}
                onClick={() => setCurrentStep(2)}
              />
            </div>
          </section>
          <SecurityCard />
        </div>
      ) : null}

      {currentStep === 2 && selectedIdentity ? (
        <div className="grid gap-3 sm:gap-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(300px,1fr)]">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)] sm:rounded-3xl sm:p-7">
            <SectionHeading
              body={formatMessage(t, "share.checkBillsBody", { name: selectedIdentity.name })}
              icon={<ReceiptText className="h-6 w-6" />}
              title={t("share.checkBills")}
            />

            <IdentityStrip currencyCode={currencyCode} identity={selectedIdentity} />

            {selectedBills.length ? (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 sm:mt-5">
                <div className="grid min-w-[720px] grid-cols-[minmax(180px,2fr)_1fr_1.2fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>{t("share.billColumn")}</span>
                  <span>{t("bills.date")}</span>
                  <span>{t("bills.paidByShort")}</span>
                  <span>{t("settlements.yourShare")}</span>
                  <span>{t("bills.grandTotal")}</span>
                </div>
                {selectedBills.map((bill) => {
                  const selectedShare = bill.shares.find(
                    (item) => item.participant_id === selectedIdentity.id
                  );
                  return (
                    <details className="group border-b border-slate-100 last:border-b-0" key={bill.id}>
                      <summary className="cursor-pointer list-none px-4 py-4 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600">
                        <div className="grid min-w-[720px] grid-cols-[minmax(180px,2fr)_1fr_1.2fr_1fr_1fr] items-center gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
                              <ReceiptText className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-slate-900">{bill.store_name}</span>
                            </span>
                            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                          </div>
                          <TableValue label={t("bills.date")} value={formatDate(bill.transaction_date_utc, t("share.anyTime"))} />
                          <TableValue label={t("bills.paidByShort")} value={bill.payer_name} />
                          <TableValue label={t("settlements.yourShare")} value={money(selectedShare?.total_share_amount ?? 0, bill.currency_code)} />
                          <TableValue label={t("bills.grandTotal")} value={money(bill.grand_total_amount, bill.currency_code)} />
                        </div>
                      </summary>
                      <div className="grid gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-4">
                        {bill.items.map((item) => (
                          <div className="flex items-start justify-between gap-4 text-sm" key={item.id}>
                            <span className="text-slate-600">{item.description}</span>
                            <span className="shrink-0 font-mono font-semibold text-slate-800">
                              {money(item.amount, bill.currency_code)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <EmptyState>
                <ReceiptText className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 font-bold text-slate-700">{t("share.noBillsForIdentity")}</p>
                <p className="mt-1">{t("share.tryAnotherParticipant")}</p>
              </EmptyState>
            )}

            <BillFooter
              billCount={selectedBills.length}
              currencyCode={currencyCode}
              identity={selectedIdentity}
              selectedBills={selectedBills}
            />

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <SecondaryButton label={t("share.back")} onClick={() => setCurrentStep(1)} />
              <PrimaryButton label={t("share.continueToPayment")} onClick={() => setCurrentStep(3)} />
            </div>
          </section>
          <aside className="grid content-start gap-5">
            <IdentitySummaryCard
              currencyCode={currencyCode}
              identity={selectedIdentity}
              transfers={selectedTransfers}
            />
            <SecurityCard />
          </aside>
        </div>
      ) : null}

      {currentStep === 3 && selectedIdentity ? (
        <div className="grid gap-3 sm:gap-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(300px,1fr)]">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.05)] sm:rounded-3xl sm:p-7">
            <SectionHeading
              body={t("share.confirmPaymentBody")}
              icon={<ShieldCheck className="h-6 w-6" />}
              title={t("share.confirmPayment")}
            />

            <div className="mt-6 grid gap-4">
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
                <EmptyState>
                  <CheckCircle2 className="mx-auto h-8 w-8 text-teal-600" />
                  <p className="mt-2 font-bold text-slate-700">{t("share.noSettlementTransfers")}</p>
                </EmptyState>
              )}
            </div>

            <div className="mt-6">
              <SecondaryButton label={t("share.back")} onClick={() => setCurrentStep(2)} />
            </div>
          </section>
          <aside className="grid content-start gap-5">
            <SettlementSummaryCard
              currencyCode={currencyCode}
              generatedAt={generatedAt}
              identity={selectedIdentity}
              transfers={selectedTransfers}
            />
            <SecurityCard />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function SectionHeading({ body, icon, title }: { body: string; icon: ReactNode; title: string }) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm sm:h-11 sm:w-11">
        {icon}
      </span>
      <div>
        <h2 className="splity-display text-lg font-extrabold tracking-tight text-slate-950 sm:text-2xl">
          {title}
        </h2>
        <p className="mt-0.5 max-w-2xl text-xs leading-5 text-slate-600 sm:mt-1 sm:text-sm sm:leading-6">{body}</p>
      </div>
    </div>
  );
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "lg" }) {
  return (
    <span className={[
      "splity-display grid shrink-0 place-items-center rounded-full bg-teal-600 font-extrabold text-white",
      size === "lg" ? "h-14 w-14 text-xl" : "h-9 w-9 text-sm",
    ].join(" ")}>
      {initials(name)}
    </span>
  );
}

function RoleBadge({ roleKey }: { roleKey: MessageKey }) {
  const { t } = useTranslation();
  const classes =
    roleKey === "settlements.role.payer"
      ? "border-red-200 bg-red-50 text-red-700"
      : roleKey === "settlements.role.receiver"
        ? "border-teal-200 bg-teal-50 text-teal-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-bold ${classes}`}>
      {t(roleKey)}
    </span>
  );
}

function CompletedBadge() {
  const { t } = useTranslation();

  return (
    <span className="inline-flex h-6 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-bold text-emerald-700">
      {t("share.completed")}
    </span>
  );
}

function BalanceLabel({ currencyCode, identity }: { currencyCode: string; identity: IdentitySummary }) {
  const { t } = useTranslation();
  const key =
    identity.net < 0
      ? "share.balanceOwes"
      : identity.net > 0
        ? "share.balanceReceives"
        : "share.balanceNeutral";
  return <>{formatMessage(t, key, { amount: money(Math.abs(identity.net), currencyCode) })}</>;
}

function StepHeader({ currentStep, onStepChange }: { currentStep: Step; onStepChange: (step: Step) => void }) {
  const { t } = useTranslation();
  const steps = ["share.step.identity", "share.step.bills", "share.step.confirm"] as const;

  return (
    <nav aria-label={t("share.progressLabel")} className="rounded-2xl border border-slate-200/80 bg-white px-2 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:px-6 sm:py-3">
      <ol className="splity-scrollbar-none flex gap-1 overflow-x-auto sm:grid sm:grid-cols-3 sm:gap-2">
        {steps.map((step, index) => {
          const stepNumber = (index + 1) as Step;
          const current = stepNumber === currentStep;
          const complete = stepNumber < currentStep;
          return (
            <li className="flex min-w-max items-center sm:min-w-0" key={step}>
              <button
                aria-current={current ? "step" : undefined}
                className={[
                  "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 sm:gap-3 sm:px-3 sm:text-sm",
                  current
                    ? "bg-teal-50 text-teal-800"
                    : complete
                      ? "cursor-pointer text-teal-700 hover:bg-teal-50"
                      : "cursor-not-allowed text-slate-400",
                ].join(" ")}
                disabled={!complete && !current}
                onClick={() => onStepChange(stepNumber)}
                type="button"
              >
                <span className={[
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs",
                  current
                    ? "bg-teal-600 text-white"
                    : complete
                      ? "bg-teal-100 text-teal-700"
                      : "bg-slate-100 text-slate-500",
                ].join(" ")}>
                  {complete ? <Check className="h-4 w-4" /> : stepNumber}
                </span>
                <span>{t(step)}</span>
              </button>
              {stepNumber < 3 ? (
                <span className={`hidden h-px min-w-6 flex-1 sm:block ${complete ? "bg-teal-400" : "bg-slate-200"}`} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SecurityCard() {
  const { t } = useTranslation();
  return (
    <aside className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 shadow-[0_12px_36px_rgba(15,118,110,0.06)] sm:rounded-3xl sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-teal-300 bg-white text-teal-700">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-bold text-slate-900">{t("share.secureTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t("share.secureBody")}</p>
        </div>
      </div>
    </aside>
  );
}

function IdentityStrip({ currencyCode, identity }: { currencyCode: string; identity: IdentitySummary }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <Avatar name={identity.name} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="font-bold text-slate-900">{identity.name}</span>
        <RoleBadge roleKey={identity.roleKey} />
      </div>
      <span className={[
        "text-sm font-bold",
        identity.net < 0 ? "text-red-600" : identity.net > 0 ? "text-teal-700" : "text-slate-500",
      ].join(" ")}>
        <BalanceLabel currencyCode={currencyCode} identity={identity} />
      </span>
    </div>
  );
}

function TableValue({ label, value }: { label: string; value: string }) {
  return (
    <div aria-label={label} className="min-w-0">
      <span className="mt-0.5 block truncate text-sm font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function BillFooter({
  billCount,
  currencyCode,
  identity,
  selectedBills,
}: {
  billCount: number;
  currencyCode: string;
  identity: IdentitySummary;
  selectedBills: PublicSettlementShare["bills"];
}) {
  const { t } = useTranslation();
  const shareTotal = selectedBills.reduce(
    (total, bill) =>
      total +
      Number(
        bill.shares.find((shareItem) => shareItem.participant_id === identity.id)
          ?.total_share_amount ?? 0
      ),
    0
  );
  const total = identity.net > 0 ? identity.net : shareTotal;
  const totalKey =
    identity.net > 0
      ? "share.totalYouReceive"
      : identity.net < 0
        ? "share.totalYouPay"
        : "share.totalNeutral";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-3 text-sm text-slate-700">
      <CircleDollarSign className="h-5 w-5 text-teal-700" />
      <span>{formatMessage(t, "share.billCount", { count: billCount })}</span>
      <span aria-hidden="true">•</span>
      <span>{t(totalKey)}:</span>
      <span className="splity-display text-lg font-extrabold text-teal-700">{money(total, currencyCode)}</span>
    </div>
  );
}

function IdentitySummaryCard({
  currencyCode,
  identity,
  transfers,
}: {
  currencyCode: string;
  identity: IdentitySummary;
  transfers: PublicSettlementShare["transfers"];
}) {
  const { t } = useTranslation();
  return (
    <aside className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)] sm:p-6">
      <h2 className="splity-display flex items-center gap-2 text-xl font-extrabold text-slate-950">
        <UserRound className="h-5 w-5 text-teal-700" /> {t("share.selectedIdentity")}
      </h2>
      <div className="mt-5 flex items-center gap-3">
        <Avatar name={identity.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{identity.name}</p>
          <div className="mt-1"><RoleBadge roleKey={identity.roleKey} /></div>
        </div>
      </div>
      <SummaryRows currencyCode={currencyCode} identity={identity} transfers={transfers} />
    </aside>
  );
}

function SettlementSummaryCard({
  currencyCode,
  generatedAt,
  identity,
  transfers,
}: {
  currencyCode: string;
  generatedAt: string;
  identity: IdentitySummary;
  transfers: PublicSettlementShare["transfers"];
}) {
  const { t } = useTranslation();
  return (
    <aside className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)] sm:p-6">
      <h2 className="splity-display flex items-center gap-2 text-xl font-extrabold text-slate-950">
        <ReceiptText className="h-5 w-5 text-teal-700" /> {t("share.settlementSummary")}
      </h2>
      <div className="mt-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <span className="text-sm text-slate-500">{t("share.youAre")}</span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold text-slate-900">{identity.name}</span>
          <RoleBadge roleKey={identity.roleKey} />
        </span>
      </div>
      <SummaryRows currencyCode={currencyCode} identity={identity} transfers={transfers} />
      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">{t("share.linkStatus")}</span>
          <Badge tone="green">{t("share.active")}</Badge>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-slate-500">{t("share.generatedLabel")}</span>
          <span className="text-right font-semibold text-slate-700">{generatedAt}</span>
        </div>
      </div>
    </aside>
  );
}

function SummaryRows({
  currencyCode,
  identity,
  transfers,
}: {
  currencyCode: string;
  identity: IdentitySummary;
  transfers: PublicSettlementShare["transfers"];
}) {
  const { t } = useTranslation();
  const pays = identity.net < 0;
  const counterparties = Array.from(
    new Set(
      transfers.map((transfer) =>
        transfer.from_participant_id === identity.id ? transfer.to_name : transfer.from_name
      )
    )
  ).join(", ");
  const status = summaryStatus(transfers, pays, t);

  return (
    <div className="mt-4 grid gap-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">{t("settlements.netAmount")}</span>
        <span className={[
          "font-bold",
          identity.net < 0 ? "text-red-600" : identity.net > 0 ? "text-teal-700" : "text-slate-700",
        ].join(" ")}>
          {money(Math.abs(identity.net), currencyCode)}
        </span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <span className="text-slate-500">
          {identity.net < 0 ? t("settlements.payTo") : t("settlements.receiveFrom")}
        </span>
        <span className="text-right font-semibold text-slate-700">{counterparties || t("bills.none")}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">{t("settlements.paymentStatus")}</span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
    </div>
  );
}

function summaryStatus(
  transfers: PublicSettlementShare["transfers"],
  isPayer: boolean,
  t: (key: MessageKey) => string
) {
  if (!transfers.length) return { label: t("settlements.paymentStatus.balanced"), tone: "green" as const };
  if (transfers.every((transfer) => transfer.status >= 2)) {
    return { label: t("share.completed"), tone: "green" as const };
  }
  if (transfers.some((transfer) => transfer.status === 0)) {
    return {
      label: t(isPayer ? "share.pendingPayment" : "share.awaitingPayment"),
      tone: "amber" as const,
    };
  }
  return { label: t("share.paidAwaitingReceipt"), tone: "green" as const };
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function PrimaryButton({
  disabled = false,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label} <ChevronRight className="h-4 w-4" />
    </button>
  );
}

function SecondaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20"
      onClick={onClick}
      type="button"
    >
      <ChevronLeft className="h-4 w-4" /> {label}
    </button>
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
  identity: Identity;
  paymentInfo: PaymentInfo;
  shareToken: string;
  transfer: PublicSettlementShare["transfers"][number];
}) {
  const [state, formAction] = useActionState<PublicShareActionState, FormData>(
    confirmPublicShareTransferAction,
    initialActionState
  );
  const [proofDataUrl, setProofDataUrl] = useState("");
  const [proofFileName, setProofFileName] = useState("");
  const [localStatus, setLocalStatus] = useState(transfer.status);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const isPayer = transfer.from_participant_id === identity.id;
  const action = isPayer ? "mark_paid" : "mark_received";
  const otherName = isPayer ? transfer.to_name : transfer.from_name;
  const actionComplete = isPayer ? localStatus >= 1 : localStatus >= 2;
  const canReceive = isPayer || localStatus >= 1;

  useEffect(() => {
    if (state.success) {
      setLocalStatus(isPayer ? 1 : 2);
      setProofDataUrl("");
      setProofFileName("");
      toast.success(state.success);
    }
    if (state.error) toast.error(state.error);
  }, [isPayer, state.error, state.success]);

  function handleFileSelected(file: File | undefined) {
    if (!file) {
      setProofDataUrl("");
      setProofFileName("");
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
    reader.onload = () => {
      setProofDataUrl(String(reader.result ?? ""));
      setProofFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  const status = transferStatus(localStatus, isPayer, t);

  return (
    <form action={formAction} className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-white">
      <input name="action" type="hidden" value={action} />
      <input name="amount" type="hidden" value={transfer.amount} />
      <input name="fromParticipantId" type="hidden" value={transfer.from_participant_id} />
      <input name="proofScreenshotDataUrl" type="hidden" value={proofDataUrl} />
      <input name="toParticipantId" type="hidden" value={transfer.to_participant_id} />
      <input name="token" type="hidden" value={shareToken} />
      <input name="transferKey" type="hidden" value={transfer.transfer_key} />

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-bold text-slate-900">
              {formatMessage(t, isPayer ? "share.youPayTo" : "share.reviewPaymentFrom", {
                name: otherName,
              })}
            </p>
            <p className={[
              "splity-display mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl",
              isPayer ? "text-red-600" : "text-teal-700",
            ].join(" ")}>
              {money(transfer.amount, currencyCode)}
            </p>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>

        {isPayer ? <PaymentDetails fallbackName={otherName} paymentInfo={paymentInfo} /> : null}
      </div>

      {isPayer && !actionComplete ? (
        <div className="border-t border-teal-100 bg-white/80 p-5 sm:p-6">
          <input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => handleFileSelected(event.target.files?.[0])}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="flex min-h-28 w-full cursor-pointer items-center justify-center gap-4 rounded-2xl border border-dashed border-teal-400 bg-teal-50/50 px-4 py-5 text-left outline-none transition-colors hover:bg-teal-50 focus-visible:ring-4 focus-visible:ring-teal-600/20"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {proofFileName ? <FileCheck2 className="h-8 w-8 shrink-0 text-teal-700" /> : <CloudUpload className="h-8 w-8 shrink-0 text-teal-700" />}
            <span>
              <span className="block text-sm font-bold text-slate-900">
                {proofFileName || t("share.proofTitle")}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{t("share.proofHelp")}</span>
            </span>
          </button>

          {proofDataUrl ? (
            <img
              alt={t("settlements.proofScreenshot")}
              className="mt-4 max-h-48 rounded-xl border border-slate-200 bg-white object-contain"
              src={proofDataUrl}
            />
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-teal-600 bg-white px-4 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <CloudUpload className="h-4 w-4" /> {t("share.uploadProof")}
            </button>
            <SubmitButton disabled={false} label={t("share.markPaid")} />
          </div>
        </div>
      ) : null}

      {transfer.proof_screenshot_data_url ? (
        <div className="border-t border-teal-100 bg-white/80 p-5 sm:p-6">
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20"
                type="button"
              >
                <Eye className="h-4 w-4" /> {t("share.viewProof")}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl overflow-hidden p-0 sm:p-0">
              <DialogHeader className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <DialogTitle>{t("share.viewProof")}</DialogTitle>
                <DialogDescription>{t("share.proofPreviewBody")}</DialogDescription>
              </DialogHeader>
              <div className="grid max-h-[calc(100dvh-10rem)] place-items-center overflow-auto bg-slate-50 p-4 sm:p-6">
                <img
                  alt={t("settlements.proofScreenshot")}
                  className="max-h-[calc(100dvh-13rem)] max-w-full rounded-xl border border-slate-200 bg-white object-contain shadow-sm"
                  src={transfer.proof_screenshot_data_url}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      {!isPayer && !canReceive ? (
        <p className="border-t border-teal-100 bg-white/80 px-5 py-4 text-sm font-semibold text-slate-500 sm:px-6">
          {t("share.markPaidFirst")}
        </p>
      ) : null}

      {!isPayer && !actionComplete ? (
        <div className="flex justify-end border-t border-teal-100 bg-white/80 p-5 sm:p-6">
          <SubmitButton disabled={!canReceive} label={t("share.markReceived")} />
        </div>
      ) : null}
    </form>
  );
}

function PaymentDetails({ fallbackName, paymentInfo }: { fallbackName: string; paymentInfo: PaymentInfo }) {
  const { t } = useTranslation();
  const accountSuffix = paymentInfo.accountNumber
    ? `•••• ${paymentInfo.accountNumber.replace(/\s/g, "").slice(-4)}`
    : "";
  const method = [paymentInfo.paymentMethod, paymentInfo.accountName, accountSuffix]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-5 grid gap-4 border-t border-teal-100 pt-5 sm:grid-cols-[1fr_1.4fr_auto]">
      <div>
        <p className="text-xs font-semibold text-slate-500">{t("share.payee")}</p>
        <div className="mt-2 flex items-center gap-2">
          <Avatar name={paymentInfo.receiverName || fallbackName} />
          <span className="font-bold text-slate-800">{paymentInfo.receiverName || fallbackName}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">{t("share.methodNotes")}</p>
        <div className="mt-2 flex items-start gap-2 text-sm font-semibold text-slate-800">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
          <span>{method || paymentInfo.notes || t("share.noPaymentMethod")}</span>
        </div>
        {method && paymentInfo.notes ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{paymentInfo.notes}</p>
        ) : null}
      </div>
      {paymentInfo.paymentQrDataUrl ? (
        <img
          alt={t("share.paymentQrAlt")}
          className="h-20 w-20 rounded-xl border border-slate-200 bg-white object-contain"
          src={paymentInfo.paymentQrDataUrl}
        />
      ) : null}
    </div>
  );
}

function SubmitButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  const toastId = useRef<string | number | null>(null);

  useEffect(() => {
    if (pending && toastId.current === null) toastId.current = toast.loading(t("common.saving"));
    if (!pending && toastId.current !== null) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }

    return () => {
      if (toastId.current !== null) toast.dismiss(toastId.current);
    };
  }, [pending, t]);

  return (
    <button
      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? <><Spinner />{t("common.saving")}</> : label}
    </button>
  );
}

function transferStatus(status: number, isPayer: boolean, t: (key: MessageKey) => string) {
  if (status >= 2) return { label: t("share.completed"), tone: "green" as const };
  if (status >= 1) return { label: t("share.paidAwaitingReceipt"), tone: "green" as const };
  return {
    label: t(isPayer ? "share.pendingPayment" : "share.awaitingPayment"),
    tone: "amber" as const,
  };
}
