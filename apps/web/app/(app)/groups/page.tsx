import { T } from "@/components/i18n/t";
import { getAppUser, requireUser } from "@/lib/auth/server";
import {
  GROUP_STATUS,
  listAccessibleGroupSummaries,
} from "@/lib/services/groups";
import { getSettlement } from "@/lib/services/settlements";
import { EmptyGroups } from "./empty-groups";
import { GroupCard } from "./group-card";
import {
  GroupsHeaderActions,
  GroupsSearchProvider,
  SearchableGroupsSection,
  StatusFilterBar,
} from "./groups-client-controls";
import { SortMenu } from "./sort-menu";
import type { GroupsSearchParams, SortMode } from "./types";
import { countStatus, currentParticipantId, firstValue, getStatusMeta, sortGroups } from "./utils";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams?: Promise<GroupsSearchParams>;
}) {
  const [params, user, appUser, groups] = await Promise.all([
    searchParams ?? Promise.resolve({} as GroupsSearchParams),
    requireUser(),
    getAppUser(),
    listAccessibleGroupSummaries(),
  ]);
  const sort = (firstValue(params.sort) as SortMode | undefined) ?? "newest";
  const queryParams = new URLSearchParams();

  if (sort !== "newest") queryParams.set("sort", sort);

  const settlements = await Promise.all(
    groups.map(async (group) => [group.id, await getSettlement(group.id).catch(() => null)] as const)
  );
  const settlementByGroup = new Map(settlements);
  const currentParticipantByGroup = new Map(
    settlements.map(([groupId, settlement]) => [
      groupId,
      currentParticipantId(settlement, {
        name: appUser?.name,
        userId: user.id,
        username: appUser?.username,
      }),
    ])
  );
  const statusCounts = {
    all: groups.length,
    settling: countStatus(groups, GROUP_STATUS.settling),
    settled: countStatus(groups, GROUP_STATUS.settled),
    unresolved: countStatus(groups, GROUP_STATUS.unresolved),
  };
  const filteredGroups = sortGroups(groups, sort);

  return (
    <GroupsSearchProvider>
      <div className="mx-auto grid w-full max-w-[1640px] gap-7">
        <header className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--splity-gold-strong)]" />
              <T k="groupsView.eyebrow" />
            </p>
            <h1 className="mt-5 text-5xl font-bold tracking-tight text-[var(--splity-ink)] sm:text-6xl">
              <T k="groupsView.title" />{" "}
              <span className="font-normal italic text-[var(--splity-navy)]">· {groups.length}</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--splity-muted)]">
              <T k="groupsView.body" />
            </p>
          </div>

          <GroupsHeaderActions />
        </header>

        <section className="rounded-3xl border border-[var(--splity-line)] bg-white p-4 shadow-[0_24px_50px_rgba(12,21,56,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <StatusFilterBar counts={statusCounts} />
            <div className="flex items-center gap-2">
              <SortMenu params={queryParams} sort={sort} />
            </div>
          </div>
        </section>

        {filteredGroups.length ? (
          <SearchableGroupsSection
            groups={filteredGroups.map((group) => ({
              id: group.id,
              name: group.name,
              status: getStatusMeta(group).filter,
            }))}
          >
            {filteredGroups.map((group) => (
              <GroupCard
                currentParticipantId={currentParticipantByGroup.get(group.id)}
                group={group}
                key={group.id}
                settlement={settlementByGroup.get(group.id) ?? null}
              />
            ))}
          </SearchableGroupsSection>
        ) : (
          <EmptyGroups />
        )}
      </div>
    </GroupsSearchProvider>
  );
}
