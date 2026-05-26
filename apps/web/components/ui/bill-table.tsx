import { BillSummary } from "@/lib/calculations/bill-read-projection";
import { SPLIT_MODE } from "@/lib/calculations/types";
import { Participant } from "@/lib/services/participants";
import { Eye, Edit3, Trash2 } from "lucide-react";
import { T } from "../i18n/t";
import { IconAction } from "./icon-action";
import { formatTableDate, splitModeLabel, initials, money } from "@/lib/services/utils";

export function BillsTable({
  bills,
  canEdit,
  groupId,
  participantById,
}: {
  bills: BillSummary[];
  canEdit: boolean;
  groupId: string;
  participantById: Map<string, Participant>;
}) {
  if (!bills.length) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-[var(--splity-line-strong)] p-8 text-center text-sm font-medium text-[var(--splity-muted)]">
        <T k="groups.firstBillHint" />
      </div>
    );
  }

  return (
    <div className="mt-8 overflow-x-auto rounded-t-2xl border border-[var(--splity-line)]">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead className="bg-[var(--splity-navy)] text-[10px] font-bold uppercase tracking-[0.16em] text-white">
          <tr>
            <th className="px-4 py-3">
              <T k="groupDetail.date" />
            </th>
            <th className="px-4 py-3">
              <T k="groupDetail.store" />
            </th>
            <th className="px-4 py-3">
              <T k="groupDetail.splitMode" />
            </th>
            <th className="px-4 py-3">
              <T k="groupDetail.primaryPayer" />
            </th>
            <th className="px-4 py-3">
              <T k="bills.subtotal" />
            </th>
            <th className="px-4 py-3">
              <T k="bills.fees" />
            </th>
            <th className="px-4 py-3">
              <T k="groupDetail.total" />
            </th>
            <th className="px-4 py-3 text-right">
              <T k="groupDetail.actions" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--splity-line)] bg-white">
          {bills.map((bill) => {
            const payer = participantById.get(bill.primaryPayerParticipantId);
            const splitIsUneven = bill.splitMode === SPLIT_MODE.weighted;

            return (
              <tr
                className="transition hover:bg-[var(--splity-bg)]/35"
                key={bill.id}>
                <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-[var(--splity-navy)]">
                  {formatTableDate(bill.transactionDateUtc)}
                </td>
                <td className="px-4 py-4 font-bold">
                  <span>{bill.storeName}</span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={[
                      "rounded-full px-2.5 py-1 text-xs font-bold",
                      splitIsUneven
                        ? "bg-purple-100 text-purple-700"
                        : "bg-amber-100 text-[var(--splity-gold-strong)]",
                    ].join(" ")}>
                    <T k={splitModeLabel(bill.splitMode)} />
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#c46920] text-[10px] font-bold text-white">
                      {payer ? initials(payer.name) : "?"}
                    </span>
                    <span className="font-medium text-[var(--splity-ink)]">
                      {payer?.name ?? <T k="groupDetail.unknown" />}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-mono font-bold text-[var(--splity-ink)]">
                  {money(bill.subtotalAmount, bill.currencyCode)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-mono text-[var(--splity-muted)]">
                  {money(bill.totalFeeAmount, bill.currencyCode)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-mono font-bold text-[var(--splity-ink)]">
                  {money(bill.grandTotalAmount, bill.currencyCode)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-1">
                    <IconAction
                      href={`/groups/${groupId}?billMode=view&billId=${bill.id}`}
                      icon={<Eye className="h-4 w-4" />}
                      label={<T k="groupDetail.viewBill" />}
                    />
                    {canEdit ? (
                      <>
                        <IconAction
                          href={`/groups/${groupId}?billMode=edit&billId=${bill.id}`}
                          icon={<Edit3 className="h-4 w-4" />}
                          label={<T k="bills.editBill" />}
                        />
                        <IconAction
                          href={`/groups/${groupId}?billMode=delete&billId=${bill.id}`}
                          icon={<Trash2 className="h-4 w-4" />}
                          label={<T k="bills.deleteBill" />}
                        />
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
