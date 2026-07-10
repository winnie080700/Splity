import { Suspense } from "react";

import { getAppUser, requireUser } from "@/lib/auth/server";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GROUP_STATUS,
  listAccessibleGroupSummaries,
} from "@/lib/services/groups";
import { getSettlement } from "@/lib/services/settlements";
import { EmptyGroups } from "./empty-groups";
import { GroupCard } from "./group-card";
import {
  GroupsHeaderActions,
  GroupsViewToggle,
  SearchableGroupsSection,
  StatusFilterBar,
} from "./groups-client-controls";
import { SortMenu } from "./sort-menu";
import { countStatus, currentParticipantId, formatDate, getStatusMeta } from "./utils";

export default async function GroupsPage() {
  const [user, appUser, groups] = await Promise.all([
    requireUser(),
    getAppUser(),
    listAccessibleGroupSummaries(),
  ]);

  const statusCounts = {
    all: groups.length,
    settling: countStatus(groups, GROUP_STATUS.settling),
    settled: countStatus(groups, GROUP_STATUS.settled),
    unresolved: countStatus(groups, GROUP_STATUS.unresolved),
  };

  return (
    <div className="grid w-full gap-5 sm:gap-7">
      <section className="rounded-2xl border border-[var(--splity-line)] bg-white p-3 shadow-[0_2px_8px_rgba(12,21,56,0.06)] sm:rounded-3xl sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StatusFilterBar counts={statusCounts} />
          <div className="flex items-center gap-2">
            <GroupsViewToggle />
            <SortMenu />
            <GroupsHeaderActions />
          </div>
        </div>
      </section>

      {groups.length ? (
        <Suspense fallback={<GroupsGridSkeleton />}>
          <GroupsList
            groups={groups}
            identity={{
              name: appUser?.name,
              userId: user.id,
              username: appUser?.username,
            }}
          />
        </Suspense>
      ) : (
        <EmptyGroups />
      )}
    </div>
  );
}

async function GroupsList({
  groups,
  identity,
}: {
  groups: Awaited<ReturnType<typeof listAccessibleGroupSummaries>>;
  identity: {
    name?: string | null;
    userId: string;
    username?: string | null;
  };
}) {
  const settlements = await Promise.all(
    groups.map(async (group) => [group.id, await getSettlement(group.id).catch(() => null)] as const)
  );
  const settlementByGroup = new Map(settlements);
  const currentParticipantByGroup = new Map(
    settlements.map(([groupId, settlement]) => [
      groupId,
      currentParticipantId(settlement, identity),
    ])
  );

  return (
    <SearchableGroupsSection
      groups={groups.map((group) => ({
        balance: Number(
          currentParticipantByGroup.get(group.id)
            ? settlementByGroup
                .get(group.id)
                ?.netBalances.find((entry) => entry.participantId === currentParticipantByGroup.get(group.id))
                ?.netAmount ?? 0
            : 0
        ),
        billCount: group.billCount,
        createdAt: formatDate(group.created_at_utc),
        createdAtMs: new Date(group.created_at_utc).getTime(),
        id: group.id,
        memberCount: group.participantCount,
        name: group.name,
        statusLabelKey: getStatusMeta(group).labelKey,
        status: getStatusMeta(group).filter,
      }))}
    >
      {groups.map((group) => (
        <GroupCard
          currentParticipantId={currentParticipantByGroup.get(group.id)}
          group={group}
          key={group.id}
          settlement={settlementByGroup.get(group.id) ?? null}
        />
      ))}
    </SearchableGroupsSection>
  );
}

function GroupsGridSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="min-h-72 rounded-3xl border border-[var(--splity-line)] bg-white p-6"
          key={index}
        >
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-4 w-28" />
          <Skeleton className="mt-8 h-8 w-28" />
          <div className="mt-8 grid grid-cols-2 gap-6 border-t border-dashed border-[var(--splity-line-strong)] pt-5">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
          <Skeleton className="mt-5 h-10 w-32" />
        </div>
      ))}
    </section>
  );
}
