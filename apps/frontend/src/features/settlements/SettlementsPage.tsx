import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@api-client";
import { useState } from "react";
import { useParams } from "react-router-dom";

export function SettlementsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const settlementQuery = useQuery({
    queryKey: ["settlements", groupId, fromDate, toDate],
    queryFn: () => apiClient.getSettlements(groupId!, {
      fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDate: toDate ? new Date(toDate).toISOString() : undefined
    }),
    enabled: Boolean(groupId)
  });
  const nameById = Object.fromEntries((settlementQuery.data?.netBalances ?? []).map((x) => [x.participantId, x.participantName]));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card p-5">
        <h2 className="text-lg font-semibold">Net Balances</h2>
        <div className="mt-3 flex gap-2">
          <input className="rounded-xl border border-ink/20 px-3 py-2" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="rounded-xl border border-ink/20 px-3 py-2" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <ul className="mt-4 space-y-2">
          {settlementQuery.data?.netBalances.map((balance) => (
            <li key={balance.participantId} className="flex items-center justify-between rounded-xl border border-ink/10 bg-white px-3 py-2">
              <span>{balance.participantName}</span>
              <span className={balance.netAmount >= 0 ? "text-green-700" : "text-red-700"}>
                RM {balance.netAmount.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Transfer Plan</h2>
        <ul className="mt-4 space-y-2">
          {settlementQuery.data?.transfers.map((transfer, index) => (
            <li key={`${transfer.fromParticipantId}-${transfer.toParticipantId}-${index}`} className="rounded-xl border border-ink/10 bg-white px-3 py-2">
              <span className="font-medium">{nameById[transfer.fromParticipantId] ?? transfer.fromParticipantId.slice(0, 8)}</span>
              <span className="mx-2">pays</span>
              <span className="font-medium">{nameById[transfer.toParticipantId] ?? transfer.toParticipantId.slice(0, 8)}</span>
              <span className="float-right font-semibold">RM {transfer.amount.toFixed(2)}</span>
            </li>
          ))}
          {(settlementQuery.data?.transfers.length ?? 0) === 0 && (
            <li className="text-sm text-ink/70">No transfers required.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
