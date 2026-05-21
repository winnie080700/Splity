import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { getBill } from "@/lib/services/bills";
import { getGroup, GROUP_STATUS } from "@/lib/services/groups";
import { listParticipants } from "@/lib/services/participants";
import { deleteBillAction } from "../actions";

type BillPageProps = {
  params: Promise<{ groupId: string; billId: string }>;
};

function formatMoney(amount: string, currencyCode: string) {
  return `${currencyCode} ${amount}`;
}

export default async function BillPage({ params }: BillPageProps) {
  const { groupId, billId } = await params;
  const [group, bill, participants] = await Promise.all([
    getGroup(groupId),
    getBill(groupId, billId),
    listParticipants(groupId),
  ]);

  if (!group || !bill) notFound();

  const participantNames = new Map(participants.map((participant) => [participant.id, participant.name]));
  const canEdit = group.status === GROUP_STATUS.unresolved;

  return (
    <div className="grid gap-6">
      <div>
        <Link className="text-sm font-semibold text-zinc-600 underline" href={`/groups/${groupId}`}>
          Back to group
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{bill.storeName}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {new Date(bill.transactionDateUtc).toLocaleDateString()} · Paid by{" "}
            {participantNames.get(bill.primaryPayerParticipantId) ?? "Unknown"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">{formatMoney(bill.grandTotalAmount, bill.currencyCode)}</Badge>
          {canEdit ? (
            <>
              <Link className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-50" href={`/groups/${groupId}/bills/${bill.id}/edit`}>
                Edit
              </Link>
              <ConfirmDialog
                action={deleteBillAction}
                confirmLabel="Delete bill"
                title="Delete this bill?"
                triggerLabel="Delete"
              >
                <input name="groupId" type="hidden" value={groupId} />
                <input name="billId" type="hidden" value={bill.id} />
                This removes the bill and all calculated shares.
              </ConfirmDialog>
            </>
          ) : null}
        </div>
      </header>

      <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Items</h2>
        {bill.items.map((item) => (
          <div className="flex flex-wrap justify-between gap-3 border-b border-zinc-100 py-3 last:border-0" key={item.id}>
            <div>
              <div className="font-medium text-zinc-950">{item.description}</div>
              <div className="mt-1 text-sm text-zinc-500">
                {item.responsibleParticipantIds.map((id) => participantNames.get(id) ?? "Unknown").join(", ")}
              </div>
            </div>
            <div className="font-semibold">{formatMoney(item.amount, bill.currencyCode)}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Totals</h2>
        <div className="grid gap-2 text-sm text-zinc-700">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(bill.subtotalAmount, bill.currencyCode)}</span></div>
          <div className="flex justify-between"><span>Fees</span><span>{formatMoney(bill.totalFeeAmount, bill.currencyCode)}</span></div>
          <div className="flex justify-between font-semibold text-zinc-950"><span>Grand total</span><span>{formatMoney(bill.grandTotalAmount, bill.currencyCode)}</span></div>
        </div>
        {bill.appliedFees.length ? (
          <div className="grid gap-2 border-t border-zinc-100 pt-3 text-sm text-zinc-600">
            {bill.appliedFees.map((fee) => (
              <div className="flex justify-between" key={fee.name}>
                <span>{fee.name}</span>
                <span>{formatMoney(fee.appliedAmount, bill.currencyCode)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Shares</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-2">Participant</th>
                <th className="py-2">Weight</th>
                <th className="py-2">Pre-fee</th>
                <th className="py-2">Fee</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.shares.map((share) => (
                <tr className="border-t border-zinc-100" key={share.participantId}>
                  <td className="py-2 font-medium">{participantNames.get(share.participantId) ?? "Unknown"}</td>
                  <td className="py-2">{share.weight}</td>
                  <td className="py-2">{formatMoney(share.preFeeAmount, bill.currencyCode)}</td>
                  <td className="py-2">{formatMoney(share.feeAmount, bill.currencyCode)}</td>
                  <td className="py-2 font-semibold">{formatMoney(share.totalShareAmount, bill.currencyCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Contributions</h2>
        {bill.contributions.map((contribution) => (
          <div className="flex justify-between gap-3 border-b border-zinc-100 py-2 text-sm last:border-0" key={contribution.participantId}>
            <span>{participantNames.get(contribution.participantId) ?? "Unknown"}</span>
            <span className="font-semibold">{formatMoney(contribution.amount, bill.currencyCode)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
