import Link from "next/link";
import {
  ArrowDownAZ,
  ArrowUpDown,
  Check,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { T } from "@/components/i18n/t";
import { getAppUser, requireUser } from "@/lib/auth/server";
import {
  GROUP_STATUS,
  isGroupStatus,
  listAccessibleGroupSummaries,
  type GroupSummary,
} from "@/lib/services/groups";
import { getSettlement, type SettlementResultDto } from "@/lib/services/settlements";
import {
  CardActions,
  GroupsHeaderActions,
  GroupsSearchProvider,
  SearchableGroupsSection,
  StatusFilterBar,
} from "./groups-client-controls";

type GroupsSearchParams = {
  sort?: string | string[];
};

type StatusFilter = "all" | "unresolved" | "settling" | "settled";
type SortMode = "newest" | "oldest" | "name";

type StatusMeta = {
  accent: string;
  badge: string;
  filter: StatusFilter;
  labelKey: "groups.status.unresolved" | "groups.status.settling" | "groups.status.settled";
};

const statusMeta: Record<number, StatusMeta> = {
  [GROUP_STATUS.unresolved]: {
    accent: "bg-[var(--splity-rose)]",
    badge: "bg-red-50 text-[var(--splity-rose)]",
    filter: "unresolved",
    labelKey: "groups.status.unresolved",
  },
  [GROUP_STATUS.settling]: {
    accent: "bg-[var(--splity-gold-strong)]",
    badge: "bg-amber-50 text-[var(--splity-gold-strong)]",
    filter: "settling",
    labelKey: "groups.status.settling",
  },
  [GROUP_STATUS.settled]: {
    accent: "bg-[var(--splity-mint)]",
    badge: "bg-emerald-50 text-[var(--splity-mint)]",
    filter: "settled",
    labelKey: "groups.status.settled",
  },
};

const avatarColors = ["#1b2a6b", "#c46920", "#2e8a5e", "#6b3ce7", "#c24a4a"];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusOf(group: GroupSummary) {
  return isGroupStatus(group.status) ? group.status : GROUP_STATUS.unresolved;
}

function getStatusMeta(group: GroupSummary) {
  return statusMeta[statusOf(group)] ?? statusMeta[GROUP_STATUS.unresolved];
}

function countStatus(groups: GroupSummary[], status: number) {
  return groups.filter((group) => statusOf(group) === status).length;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(new Date(value))
    .toUpperCase();
}

function money(value: number | string | null | undefined, currency = "RM") {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount === 0) return `${currency} 0.00`;
  const sign = amount > 0 ? "+" : "-";
  return `${sign}${currency} ${Math.abs(amount).toFixed(2)}`;
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

function buildHref(params: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(params);

  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      next.delete(key);
      return;
    }
    next.set(key, value);
  });

  const query = next.toString();
  return query ? `/groups?${query}` : "/groups";
}

function currentParticipantId(
  settlement: SettlementResultDto | null,
  input: { name?: string | null; userId: string; username?: string | null }
) {
  return settlement?.participants.find((participant) => {
    return (
      participant.invited_user_id === input.userId ||
      (input.username ? participant.username === input.username : false) ||
      (input.name ? participant.name === input.name : false)
    );
  })?.id;
}

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
  const filteredGroups = groups
    .sort((left, right) => {
      if (sort === "oldest") {
        return new Date(left.created_at_utc).getTime() - new Date(right.created_at_utc).getTime();
      }
      if (sort === "name") {
        return left.name.localeCompare(right.name);
      }
      return new Date(right.created_at_utc).getTime() - new Date(left.created_at_utc).getTime();
    });

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

function SortMenu({ params, sort }: { params: URLSearchParams; sort: SortMode }) {
  const label = sort === "oldest" ? "Oldest" : sort === "name" ? "Name" : "Newest";

  return (
    <details className="group relative">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-3 text-sm font-bold text-[var(--splity-ink)] transition hover:border-[var(--splity-line-strong)]">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--splity-muted)]">
          SORT
        </span>
        {label}
        <ArrowUpDown className="h-3.5 w-3.5 text-[var(--splity-muted)]" />
      </summary>
      <div className="absolute right-0 z-10 mt-2 grid w-36 overflow-hidden rounded-xl border border-[var(--splity-line)] bg-white p-1 text-sm font-semibold shadow-lg">
        {(["newest", "oldest", "name"] as SortMode[]).map((mode) => (
          <Link
            className="flex h-9 items-center justify-between rounded-lg px-3 text-[var(--splity-ink)] hover:bg-[var(--splity-bg)]"
            href={buildHref(params, { sort: mode === "newest" ? null : mode })}
            key={mode}
          >
            {mode === "newest" ? "Newest" : mode === "oldest" ? "Oldest" : "Name"}
            {sort === mode ? <Check className="h-3.5 w-3.5" /> : null}
          </Link>
        ))}
      </div>
    </details>
  );
}

function GroupCard({
  currentParticipantId,
  group,
  settlement,
}: {
  currentParticipantId?: string;
  group: GroupSummary;
  settlement: SettlementResultDto | null;
}) {
  const meta = getStatusMeta(group);
  const balance = currentParticipantId
    ? settlement?.netBalances.find((entry) => entry.participantId === currentParticipantId)?.netAmount
    : null;
  const participants = settlement?.participants.slice(0, 5) ?? [];
  const balanceValue = Number(balance ?? 0);

  return (
    <article
      className="group relative block min-h-72 w-full overflow-hidden rounded-3xl border border-[var(--splity-line)] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(12,21,56,0.08)]"
    >
      <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${meta.accent}`} />
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-bold tracking-tight text-[var(--splity-ink)]">
            {group.name}
          </h2>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--splity-muted)]">
            <T k="common.created" values={{ date: formatDate(group.created_at_utc) }} />
          </p>
        </div>
        <span className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.12em] ${meta.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.accent}`} />
          <T k={meta.labelKey} />
        </span>
      </div>

      <div className="mt-6">
        <div className="flex -space-x-2">
          {participants.length ? (
            participants.map((participant, index) => (
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
                key={participant.id}
                style={{ backgroundColor: avatarColors[index % avatarColors.length] }}
              >
                {initials(participant.name)}
              </span>
            ))
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[var(--splity-navy)] text-[10px] font-bold text-white">
              <Users className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-dashed border-[var(--splity-line-strong)] pt-5">
        <div className="grid grid-cols-2 gap-6">
          <Stat label={<T k="groups.participants" />} suffix="people" value={group.participantCount} />
          <Stat label={<T k="groups.bills" />} suffix="logged" value={group.billCount} />
        </div>
        <div className="mt-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
            <T k="dashboard.yourBalance" />
          </div>
          <div
            className={[
              "mt-2 text-sm font-bold",
              balanceValue > 0
                ? "text-[var(--splity-mint)]"
                : balanceValue < 0
                  ? "text-[var(--splity-rose)]"
                  : "text-[var(--splity-ink)]",
            ].join(" ")}
          >
            {group.billCount > 0 ? money(balanceValue) : <T k="groupsView.addBill" />}
          </div>
        </div>
      </div>
      <CardActions groupId={group.id} groupName={group.name} />
    </article>
  );
}

function Stat({ label, suffix, value }: { label: ReactNode; suffix: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--splity-muted)]">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold leading-none text-[var(--splity-ink)]">
          {value}
        </span>
        <span className="text-sm font-medium text-[var(--splity-muted)]">{suffix}</span>
      </div>
    </div>
  );
}

function EmptyGroups() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--splity-line-strong)] bg-white/45 p-10 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--splity-navy)] text-[var(--splity-gold)]">
        <ArrowDownAZ className="h-5 w-5" />
      </span>
      <h2 className="mt-5 text-2xl font-bold">
        <T k="dashboard.noGroupsTitle" />
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--splity-muted)]">
        <T k="dashboard.noGroupsBody" />
      </p>
    </div>
  );
}
