import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GROUP_STATUS } from "@/lib/domain/status";
import { getGroup } from "@/lib/services/groups";
import { getSettlement } from "@/lib/services/settlements";
import { TransferRow } from "./transfer-row";

type SettlementsPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default async function SettlementsPage({ params, searchParams }: SettlementsPageProps) {
  const { groupId } = await params;
  const { from, to } = await searchParams;
  const group = await getGroup(groupId);
  if (!group) notFound();

  const settlement = await getSettlement(groupId, from ? `${from}T00:00:00.000Z` : null, to ? `${to}T23:59:59.999Z` : null);
  const participantLookup = Object.fromEntries(
    settlement.participants.map((participant) => [participant.id, participant.name])
  );
  const isSettling = settlement.groupStatus === GROUP_STATUS.settling;

  return (
    <div className="grid gap-6">
      <div>
        <Link className="text-sm font-semibold text-zinc-600 underline" href={`/groups/${groupId}`}>
          Back to group
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settlement</h1>
          <p className="mt-2 text-sm text-zinc-500">{group.name}</p>
        </div>
        <Badge tone={isSettling ? "amber" : "blue"}>{isSettling ? "Settling" : "Read only"}</Badge>
      </header>

      <form className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Input defaultValue={dateInputValue(settlement.fromDateUtc)} label="From" name="from" type="date" />
        <Input defaultValue={dateInputValue(settlement.toDateUtc)} label="To" name="to" type="date" />
        <button className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800">
          Apply
        </button>
      </form>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Net balances</h2>
          <p className="mt-1 text-sm text-zinc-600">Positive balances receive money; negative balances pay.</p>
        </div>
        <div className="divide-y divide-zinc-100">
          {settlement.netBalances.map((balance) => (
            <div className="flex items-center justify-between py-3" key={balance.participantId}>
              <span className="font-medium text-zinc-950">{balance.participantName}</span>
              <span className={Number(balance.netAmount) >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                {Number(balance.netAmount) >= 0 ? "+" : ""}MYR {balance.netAmount}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Transfers</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {settlement.transfers.length
              ? `${settlement.transfers.length} suggested transfer${settlement.transfers.length === 1 ? "" : "s"}.`
              : "No transfers are needed for this date range."}
          </p>
        </div>

        {settlement.transfers.length ? (
          <div>
            {settlement.transfers.map((transfer) => (
              <TransferRow
                canManage={settlement.canManage}
                fromDateUtc={settlement.fromDateUtc}
                groupId={groupId}
                key={transfer.transferKey}
                participantLookup={participantLookup}
                participants={settlement.participants}
                statusIsSettling={isSettling}
                toDateUtc={settlement.toDateUtc}
                transfer={transfer}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            Everyone is balanced for this snapshot.
          </div>
        )}
      </section>
    </div>
  );
}
