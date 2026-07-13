import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ReceiptText,
  Share2,
  Users,
  WalletCards,
} from "lucide-react";

import { T } from "@/components/i18n/t";
import { MetricCard } from "@/components/ui/metric-card";
import { getUser } from "@/lib/auth/server";
import { serverT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";
import { listGroupActivity } from "@/lib/services/activity";
import { listBillDetails } from "@/lib/services/bills";
import { GROUP_STATUS, getGroup, isGroupStatus } from "@/lib/services/groups";
import { listParticipants } from "@/lib/services/participants";
import { getActiveShare } from "@/lib/services/settlement-shares";
import { getSettlementFromBillDetails } from "@/lib/services/settlements";
import {
  formatDate,
  formatTableDate,
  groupFees,
  groupTotal,
  money,
  pendingTransferCount,
  initials,
  splitModeLabel,
} from "@/lib/services/utils";
import { BillExportButton } from "./bill-export-button";
import { BillsLiveTable } from "./bills-live-table";
import { BillModal } from "./bill-modal";
import { GroupHeaderActions } from "./group-header-actions";
import { ParticipantsForm } from "./participants-form";
import { SettlementParticipantCards } from "./settlement-participant-cards";
import { SettlementExportButton } from "./settlement-export-button";
import { buildParticipantSettlementCards } from "./settlement-participant-data";
import { buildSettlementReceiverInfos } from "./settlement-receiver-info";
import { ShareSettlementModal } from "./share-settlement-modal";
import { type GroupPageProps, statusMeta } from "./type";
import { transferActivitySummary } from "./activity-summary";

const tabs = [
  ["bills", "groupDetail.tabBills"],
  ["participants", "groupDetail.tabParticipants"],
  ["settlement", "groupDetail.tabSettlement"],
  ["activity", "groupDetail.tabActivity"],
] as const;

const activityFilters = [
  ["all", "groupDetail.activityAll"],
  ["bills", "groupDetail.activityBills"],
  ["participants", "groupDetail.activityParticipants"],
  ["status", "groupDetail.activityStatus"],
  ["settlement", "groupDetail.activitySettlement"],
] as const;

function activityFilterFor(eventType: string) {
  if (eventType.startsWith("bill_")) return "bills";
  if (eventType.startsWith("participant_")) return "participants";
  if (eventType.startsWith("group_status")) return "status";
  if (eventType.startsWith("transfer_")) return "settlement";
  return "all";
}

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const { groupId } = await params;
  const query = (await searchParams) ?? {};
  const tab = tabs.some(([value]) => value === query.tab) ? query.tab! : "bills";
  const [group, user, participants, allBills] = await Promise.all([
    getGroup(groupId),
    getUser(),
    listParticipants(groupId),
    listBillDetails(groupId),
  ]);
  if (!group) notFound();
  const settlement = user
    ? await getSettlementFromBillDetails({
        bills: allBills,
        createdByUserId: group.created_by_user_id,
        currentUserId: user.id,
        groupId,
        groupStatus: group.status,
        participants,
      }).catch(() => null)
    : null;
  const [activeShare, activity] = await Promise.all([
    query.shareSettlement === "1" ? getActiveShare(groupId).catch(() => null) : null,
    tab === "activity" ? listGroupActivity(groupId).catch(() => []) : [],
  ]);
  const activityFilter = activityFilters.some(([value]) => value === query.activityFilter) ? query.activityFilter! : "all";
  const filteredActivity = activityFilter === "all" ? activity : activity.filter((item) => activityFilterFor(item.event_type) === activityFilter);
  const status = isGroupStatus(group.status) ? group.status : GROUP_STATUS.unresolved;
  const meta = statusMeta[status] ?? statusMeta[GROUP_STATUS.unresolved];
  const organizer = group.created_by_user_id === user?.id;
  const canWriteBills = status === GROUP_STATUS.unresolved;
  const canManageParticipants = organizer && status === GROUP_STATUS.unresolved;
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const participantNames = new Map(participants.map((participant) => [participant.id, participant.name]));
  const currencyCode = allBills[0]?.currencyCode ?? "MYR";
  const total = groupTotal(allBills);
  const fees = groupFees(allBills);
  const transfersPending = pendingTransferCount(settlement);
  const groupHref = `/groups/${group.id}`;
  const billMode =
    query.billMode === "new" || query.billMode === "view" || query.billMode === "edit" || query.billMode === "delete"
      ? query.billMode
      : null;
  const receiverInfos =
    query.shareSettlement === "1"
      ? await buildSettlementReceiverInfos(groupId, participants, settlement)
      : [];
  const settlementCards =
    tab === "settlement"
      ? buildParticipantSettlementCards({ bills: allBills, participants, settlement })
      : [];
  const [systemName, markedPaidLabel, pendingLabel, receivedLabel] = await Promise.all([
    tab === "activity" ? serverT("groupDetail.activity.system") : "",
    tab === "settlement" ? serverT("settlements.status.markedPaid") : "",
    tab === "settlement" ? serverT("settlements.status.pending") : "",
    tab === "settlement" ? serverT("settlements.status.received") : "",
  ]);
  const settlementStatusLabels =
    tab === "settlement"
      ? {
          markedPaid: markedPaidLabel,
          pending: pendingLabel,
          received: receivedLabel,
        }
      : { markedPaid: "", pending: "", received: "" };

  return (
    <div className="mx-auto grid w-full max-w-[1640px] gap-5">
      <nav className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--splity-muted)]">
        <Link className="transition hover:text-teal-700" href="/groups">
          <T k="dashboard.groupsTitle" />
        </Link>
        <span>/</span>
        <span className="truncate text-[var(--splity-ink)]">{group.name}</span>
      </nav>

      <section className="rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_8px_28px_rgba(12,21,56,0.07)] sm:p-7">
        <div className="grid gap-5 lg:flex lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
              <Users className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h1 className="splity-display truncate text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {group.name}
                </h1>
                <span className="inline-flex shrink-0 items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(group.created_at_utc)}
                  </span>
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                    <T k={meta.labelKey} />
                  </span>
                </span>
              </div>
            </div>
          </div>
          {organizer && status !== GROUP_STATUS.settled ? (
            <GroupHeaderActions groupId={group.id} name={group.name} status={status} />
          ) : null}
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Users className="h-4 w-4" />} label={<T k="groups.participants" />} value={participants.length} />
          <MetricCard icon={<ReceiptText className="h-4 w-4" />} label={<T k="groups.bills" />} value={allBills.length} />
          <MetricCard accent icon={<WalletCards className="h-4 w-4" />} label={<T k="groupDetail.groupTotal" />} value={money(total, currencyCode)} />
          <MetricCard icon={<ArrowRight className="h-4 w-4" />} label={<T k="groupDetail.transfersPending" />} value={transfersPending} />
        </div>

        <div aria-label={await serverT("groupDetail.tabsLabel")} className="splity-scrollbar-none mt-6 flex gap-1 overflow-x-auto border-b border-[var(--splity-line)]" role="tablist">
          {tabs.map(([value, label]) => (
            <Link
              aria-selected={tab === value}
              className={`shrink-0 border-b-2 px-5 py-3 text-sm font-bold transition ${
                tab === value ? "border-teal-700 text-teal-700" : "border-transparent text-[var(--splity-muted)] hover:text-[var(--splity-ink)]"
              }`}
              href={`${groupHref}?tab=${value}`}
              key={value}
              role="tab"
            >
              <T k={label} />
            </Link>
          ))}
        </div>
      </section>

      {tab === "bills" ? (
        <section className="splity-page-enter rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-[0_8px_28px_rgba(12,21,56,0.06)] sm:p-7">
          <BillsLiveTable
            actions={
              <BillExportButton
                bills={allBills.map((bill) => ({
                  date: formatTableDate(bill.transactionDateUtc),
                  fees: money(bill.totalFeeAmount, bill.currencyCode),
                  grandTotal: money(bill.grandTotalAmount, bill.currencyCode),
                  items: bill.items.map((item) => ({
                    amount: money(item.amount, bill.currencyCode),
                    description: item.description,
                    participants: item.responsibleParticipantIds.map((id) => participantById.get(id)?.name ?? "").filter(Boolean),
                  })),
                  payer: participantById.get(bill.primaryPayerParticipantId)?.name ?? "",
                  shares: bill.shares
                    .filter((share) => Number(share.preFeeAmount) !== 0)
                    .map((share) => ({
                      fee: money(share.feeAmount, bill.currencyCode),
                      participant: participantById.get(share.participantId)?.name ?? "",
                      preFee: money(share.preFeeAmount, bill.currencyCode),
                      total: money(share.totalShareAmount, bill.currencyCode),
                    })),
                  splitModeKey: splitModeLabel(bill.splitMode),
                  storeName: bill.storeName,
                  subtotal: money(bill.subtotalAmount, bill.currencyCode),
                }))}
                filename={`splity-${group.name}-bills-report`}
                groupDate={formatDate(group.created_at_utc)}
                groupName={group.name}
                totals={{ fees: money(fees, currencyCode), grandTotal: money(total, currencyCode), subtotal: money(total - fees, currencyCode) }}
              />
            }
            bills={allBills}
            canEdit={canWriteBills}
            groupId={group.id}
            participants={participants}
          />
          {allBills.length ? (
            <div className="grid gap-4 rounded-b-2xl border border-t-0 border-teal-100 bg-teal-50/60 px-5 py-4 text-sm sm:flex sm:justify-end sm:gap-10">
              <span><T k="bills.subtotal" /> <strong>{money(total - fees, currencyCode)}</strong></span>
              <span><T k="bills.fees" /> <strong>{money(fees, currencyCode)}</strong></span>
              <span className="text-teal-800"><T k="groupDetail.groupTotal" /> <strong>{money(total, currencyCode)}</strong></span>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "participants" ? (
        <div className="splity-page-enter">
          <ParticipantsForm canEdit={canManageParticipants} creatorUserId={group.created_by_user_id} groupId={group.id} participants={participants} />
        </div>
      ) : null}

      {tab === "settlement" ? (
        <div className="splity-page-enter grid gap-5">
          <section className="rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-sm sm:p-7">
            <h2 className="splity-display text-2xl font-bold"><T k="groupDetail.balanceSummary" /></h2>
            <SettlementParticipantCards cards={settlementCards} />
          </section>
          <section className="rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="splity-display text-2xl font-bold"><T k="groupDetail.transferPlan" /></h2><p className="mt-1 text-sm text-[var(--splity-muted)]"><T k="groupDetail.transferPlanBody" /></p></div>
              <div className="flex flex-wrap gap-2">
                {status === GROUP_STATUS.settling ? <Link className="inline-flex h-10 items-center gap-2 rounded-xl border border-teal-300 px-4 text-sm font-bold text-teal-800" href={`${groupHref}?tab=settlement&shareSettlement=1`}><Share2 className="h-4 w-4" /><T k="groupDetail.shareSettlement" /></Link> : null}
                <SettlementExportButton
                  filename={`splity-${group.name}-settlement`}
                  groupDate={formatDate(group.created_at_utc)}
                  groupName={group.name}
                  transfers={(settlement?.transfers ?? []).map((transfer) => ({
                    amount: money(transfer.amount, currencyCode),
                    from: participantById.get(transfer.fromParticipantId)?.name ?? "",
                    status: transfer.status === 2 ? settlementStatusLabels.received : transfer.status === 1 ? settlementStatusLabels.markedPaid : settlementStatusLabels.pending,
                    to: participantById.get(transfer.toParticipantId)?.name ?? "",
                  }))}
                />
              </div>
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--splity-line)]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-teal-50 text-xs uppercase tracking-wider text-teal-800"><tr><th className="px-4 py-3"><T k="settlements.from" /></th><th className="px-4 py-3"><T k="settlements.to" /></th><th className="px-4 py-3"><T k="groupDetail.amount" /></th><th className="px-4 py-3"><T k="invitations.status" /></th></tr></thead>
                <tbody className="divide-y divide-[var(--splity-line)]">
                  {(settlement?.transfers ?? []).map((transfer) => {
                    const fromName = participantById.get(transfer.fromParticipantId)?.name ?? "";
                    const toName = participantById.get(transfer.toParticipantId)?.name ?? "";
                    return <tr key={transfer.transferKey}>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-teal-700 text-xs font-bold text-white">{initials(fromName)}</span><strong>{fromName}</strong></span></td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-3"><ArrowRight className="h-4 w-4 text-teal-700" /><span className="grid h-8 w-8 place-items-center rounded-full bg-teal-700 text-xs font-bold text-white">{initials(toName)}</span><strong>{toName}</strong></span></td>
                      <td className="px-4 py-3 font-mono font-bold">{money(transfer.amount, currencyCode)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${transfer.status === 2 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : transfer.status === 1 ? "border-sky-200 bg-sky-50 text-sky-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}><T k={transfer.status === 2 ? "settlements.status.received" : transfer.status === 1 ? "settlements.status.markedPaid" : "settlements.status.pending"} /></span></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-teal-100 bg-teal-50/45 px-5 py-4 text-sm">
              <strong className="text-teal-800"><T k="groupDetail.pendingTransferCount" values={{ count: transfersPending }} /></strong>
              <span className="text-amber-700"><T k="settlements.status.pending" /></span>
              <span className="text-sky-700"><T k="settlements.status.markedPaid" /></span>
              <span className="text-emerald-700"><T k="settlements.status.received" /></span>
            </div>
          </section>
        </div>
      ) : null}

      {tab === "activity" ? (
        <section className="splity-page-enter rounded-3xl border border-[var(--splity-line)] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="splity-display text-2xl font-bold"><T k="groupDetail.activity" /></h2>
            <span className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800"><T k="groupDetail.activityCount" values={{ count: filteredActivity.length }} /></span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {activityFilters.map(([value, key]) => (
              <Link
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  activityFilter === value
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-teal-100 bg-teal-50 text-teal-800 hover:border-teal-300"
                }`}
                href={`${groupHref}?tab=activity&activityFilter=${value}`}
                key={value}
              >
                <T k={key} />
              </Link>
            ))}
          </div>
          <div className="mt-5 divide-y divide-[var(--splity-line)] overflow-hidden rounded-2xl border border-[var(--splity-line)]">
            {filteredActivity.length ? filteredActivity.map((item) => {
              const summary = typeof item.summary_data === "object" && item.summary_data && !Array.isArray(item.summary_data) ? item.summary_data as Record<string, unknown> : {};
              const name = String(summary.storeName ?? summary.participantName ?? "");
              const eventKey = `groupDetail.activity.${item.event_type}` as MessageKey;
              const transferSummary = item.event_type === "transfer_status_updated"
                ? transferActivitySummary(
                    summary,
                    participantNames
                  )
                : null;
              const displayName = transferSummary?.name || String(summary.actorName ?? systemName);
              return <div className="flex items-center gap-4 px-4 py-4" key={item.id}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-700 font-bold text-white">{displayName.slice(0, 1).toUpperCase()}</span><p className="min-w-0 flex-1 text-sm">{transferSummary ? <T k={transferSummary.messageKey} values={{ name: transferSummary.name || systemName }} /> : <><strong>{displayName}</strong> <T k={eventKey} values={{ name }} /></>}</p><time className="shrink-0 text-xs text-[var(--splity-muted)]">{formatDate(item.created_at_utc)}</time></div>;
            }) : <p className="p-8 text-center text-sm text-[var(--splity-muted)]"><T k="groupDetail.activityEmpty" /></p>}
          </div>
        </section>
      ) : null}

      <BillModal billId={query.billId ?? null} canEdit={canWriteBills} closeHref={`${groupHref}?tab=bills`} groupId={group.id} mode={billMode} participants={participants} />
      <ShareSettlementModal activeShare={activeShare} closeHref={`${groupHref}?tab=settlement`} groupId={group.id} open={query.shareSettlement === "1"} receivers={receiverInfos} />
    </div>
  );
}
