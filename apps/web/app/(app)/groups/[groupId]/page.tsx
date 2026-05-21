import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  GROUP_STATUS,
  GROUP_STATUS_LABELS,
  getGroup,
  isGroupStatus,
} from "@/lib/services/groups";
import { listParticipants } from "@/lib/services/participants";
import { listBills } from "@/lib/services/bills";
import { GroupManagement } from "./group-management";
import { ParticipantsForm } from "./participants-form";

type GroupPageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params;
  const group = await getGroup(groupId);
  if (!group) notFound();

  const [participants, bills] = await Promise.all([listParticipants(groupId), listBills(groupId)]);
  const status = isGroupStatus(group.status) ? group.status : 0;
  const canEditParticipants = status === GROUP_STATUS.unresolved;

  return (
    <div className="grid gap-6">
      <div>
        <Link className="text-sm font-semibold text-zinc-600 underline" href="/dashboard">
          Back to groups
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{group.name}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Created {new Date(group.created_at_utc).toLocaleDateString()}
          </p>
        </div>
        <Badge tone={status === 0 ? "green" : status === 1 ? "amber" : "blue"}>
          {GROUP_STATUS_LABELS[status]}
        </Badge>
      </header>

      <ParticipantsForm
        canEdit={canEditParticipants}
        groupId={group.id}
        participants={participants}
      />

      <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Bills</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {bills.length ? `${bills.length} bill${bills.length === 1 ? "" : "s"} in this group.` : "No bills yet."}
            </p>
          </div>
          {status === GROUP_STATUS.unresolved ? (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
              href={`/groups/${group.id}/bills/new`}
            >
              New bill
            </Link>
          ) : null}
        </div>

        {bills.length ? (
          <div className="divide-y divide-zinc-100">
            {bills.map((bill) => (
              <Link
                className="grid gap-2 py-3 transition hover:bg-zinc-50 sm:grid-cols-[1fr_auto]"
                href={`/groups/${group.id}/bills/${bill.id}`}
                key={bill.id}
              >
                <div>
                  <div className="font-medium text-zinc-950">{bill.storeName}</div>
                  <div className="mt-1 text-sm text-zinc-500">
                    {new Date(bill.transactionDateUtc).toLocaleDateString()}
                  </div>
                </div>
                <div className="font-semibold text-zinc-950">
                  {bill.currencyCode} {bill.grandTotalAmount}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            Add the first bill after your participants are set.
          </div>
        )}
      </section>

      {status !== GROUP_STATUS.unresolved ? (
        <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Settlement</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {status === GROUP_STATUS.settling
                  ? "Manage suggested transfers for this group."
                  : "Review the final settlement history."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {status === GROUP_STATUS.settling ? (
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                  href={`/groups/${group.id}/share`}
                >
                  Share publicly
                </Link>
              ) : null}
              <Link
                className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                href={`/groups/${group.id}/settlements`}
              >
                {status === GROUP_STATUS.settling ? "Manage settlements" : "View settlements"}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <GroupManagement
        groupId={group.id}
        name={group.name}
        participantCount={participants.length}
        status={status}
      />
    </div>
  );
}
