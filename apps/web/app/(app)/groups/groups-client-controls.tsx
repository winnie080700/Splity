"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";
import {
  Children,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { T } from "@/components/i18n/t";
import { useTranslation, type MessageKey } from "@/lib/i18n";
import type { StatusFilter } from "./types";
import { useGroupsSearch } from "./groups-search";

type SearchableGroup = {
  balance: number;
  billCount: number;
  createdAt: string;
  createdAtMs: number;
  id: string;
  memberCount: number;
  name: string;
  statusLabelKey: MessageKey;
  status: StatusFilter;
};

const PAGE_SIZE = 6;

function money(value: number, currency = "RM") {
  if (!Number.isFinite(value) || value === 0) return `${currency} 0.00`;
  return `${value > 0 ? "+" : "-"}${currency} ${Math.abs(value).toFixed(2)}`;
}

export function GroupsHeaderActions() {
  return (
    <div className="shrink-0">
      <Link
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#087f6f] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(8,127,111,0.18)] transition hover:bg-[#066c60] sm:h-12 sm:px-5"
        href="/groups/create"
      >
        <Plus className="h-4 w-4" />
        <T k="groupsView.createGroup" />
      </Link>
    </div>
  );
}

export function GroupsViewToggle() {
  const { setView, view } = useGroupsSearch();

  return (
    <div className="inline-flex h-12 overflow-hidden rounded-xl border border-[var(--splity-line)] bg-white p-1">
      <button
        aria-pressed={view === "grid"}
        className={[
          "inline-flex items-center gap-2 rounded-lg px-4 text-sm font-bold transition",
          view === "grid"
            ? "bg-emerald-50 text-[#087f6f] shadow-sm"
            : "text-[var(--splity-muted)] hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]",
        ].join(" ")}
        onClick={() => setView("grid")}
        type="button"
      >
        <LayoutGrid className="h-4 w-4" />
        <T k="groupsView.grid" />
      </button>
      <button
        aria-pressed={view === "list"}
        className={[
          "inline-flex items-center gap-2 rounded-lg px-4 text-sm font-bold transition",
          view === "list"
            ? "bg-emerald-50 text-[#087f6f] shadow-sm"
            : "text-[var(--splity-muted)] hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]",
        ].join(" ")}
        onClick={() => setView("list")}
        type="button"
      >
        <List className="h-4 w-4" />
        <T k="groupsView.list" />
      </button>
    </div>
  );
}

export function StatusFilterBar({
  counts,
}: {
  counts: Record<StatusFilter, number>;
}) {
  const { status, setStatus } = useGroupsSearch();

  return (
    <div className="flex flex-wrap gap-2">
      <StatusButton active={status === "all"} count={counts.all} onClick={() => setStatus("all")}>
        <T k="groupsView.tabAll" />
      </StatusButton>
      <StatusButton
        active={status === "unresolved"}
        count={counts.unresolved}
        dot="bg-[var(--splity-rose)]"
        onClick={() => setStatus("unresolved")}
      >
        <T k="groups.status.unresolved" />
      </StatusButton>
      <StatusButton
        active={status === "settling"}
        count={counts.settling}
        dot="bg-[var(--splity-gold-strong)]"
        onClick={() => setStatus("settling")}
      >
        <T k="groups.status.settling" />
      </StatusButton>
      <StatusButton
        active={status === "settled"}
        count={counts.settled}
        dot="bg-[var(--splity-mint)]"
        onClick={() => setStatus("settled")}
      >
        <T k="groups.status.settled" />
      </StatusButton>
    </div>
  );
}

function StatusButton({
  active,
  children,
  count,
  dot,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  count: number;
  dot?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition sm:rounded-xl sm:px-4",
        active
          ? "border-[#087f6f] bg-[#087f6f] text-white shadow-[0_10px_22px_rgba(8,127,111,0.18)]"
          : "border-[var(--splity-line)] bg-white text-[var(--splity-ink)] hover:border-[var(--splity-line-strong)]",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {dot ? <span className={`h-2 w-2 rounded-full ${dot}`} /> : null}
      <span>{children}</span>
      <span className={active ? "text-white/80" : "text-[var(--splity-muted)]"}>{count}</span>
    </button>
  );
}

export function SearchableGroupsSection({
  children,
  groups,
}: {
  children: ReactNode;
  groups: SearchableGroup[];
}) {
  const { query, sort, status, view } = useGroupsSearch();
  const [page, setPage] = useState(1);
  const normalized = query.trim().toLowerCase();
  const cards = Children.toArray(children);
  const visibleIndexes = groups
    .map((group, index) => ({ group, index }))
    .filter(({ group }) => {
      const matchesQuery = !normalized || group.name.toLowerCase().includes(normalized);
      const matchesStatus = status === "all" || group.status === status;
      return matchesQuery && matchesStatus;
    })
    .sort((left, right) => {
      if (sort === "oldest") return left.group.createdAtMs - right.group.createdAtMs;
      if (sort === "name") return left.group.name.localeCompare(right.group.name);
      return right.group.createdAtMs - left.group.createdAtMs;
    })
    .map(({ index }) => index);
  const totalPages = Math.max(Math.ceil(visibleIndexes.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const pageIndexes = visibleIndexes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, sort, status, view]);

  return (
    <div className="grid gap-5">
      {view === "grid" ? (
        <section className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {pageIndexes.map((index) => (
            <div className="h-full" key={groups[index]?.id ?? index}>
              {cards[index]}
            </div>
          ))}
          {visibleIndexes.length === 0 ? <NoSearchResults /> : null}
        </section>
      ) : (
        <GroupsTable groups={pageIndexes.map((index) => groups[index]).filter(Boolean)} />
      )}
      {visibleIndexes.length > PAGE_SIZE ? (
        <Pagination currentPage={currentPage} onPageChange={setPage} totalPages={totalPages} />
      ) : null}
    </div>
  );
}

function GroupsTable({ groups }: { groups: SearchableGroup[] }) {
  if (!groups.length) return <NoSearchResults />;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white shadow-[0_10px_30px_rgba(12,21,56,0.05)]">
      <div className="splity-scrollbar-none overflow-x-auto">
        <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left">
          <thead className="bg-[#087f6f] text-white">
            <tr className="text-xs font-extrabold uppercase tracking-[0.12em] text-white">
              <TableHead><T k="groupsView.groupName" /></TableHead>
              <TableHead><T k="groups.status" /></TableHead>
              <TableHead><T k="groupsView.members" /></TableHead>
              <TableHead><T k="groups.bills" /></TableHead>
              <TableHead><T k="groupsView.balance" /></TableHead>
              <TableHead><T k="groupsView.createdAt" /></TableHead>
              <TableHead><T k="groupsView.action" /></TableHead>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr className="border-t border-[var(--splity-line)]" key={group.id}>
                <TableCell>
                  <div className="text-base font-extrabold text-[var(--splity-ink)]">{group.name}</div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-extrabold ${statusBadgeClass(group.status)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(group.status)}`} />
                    <T k={group.statusLabelKey} />
                  </span>
                </TableCell>
                <TableCell>{group.memberCount}</TableCell>
                <TableCell>{group.billCount}</TableCell>
                <TableCell>
                  <span
                    className={[
                      "font-extrabold",
                      group.balance > 0
                        ? "text-[var(--splity-mint)]"
                        : group.balance < 0
                          ? "text-[var(--splity-rose)]"
                          : "text-[var(--splity-mint)]",
                    ].join(" ")}
                  >
                    {money(group.balance)}
                  </span>
                </TableCell>
                <TableCell>{group.createdAt}</TableCell>
                <TableCell>
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--splity-line)] bg-white px-4 text-sm font-bold text-[#087f6f] transition hover:border-[#087f6f] hover:bg-emerald-50"
                    href={`/groups/${group.id}`}
                  >
                    <T k="groupsView.view" />
                  </Link>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="border-b border-[var(--splity-line)] px-5 py-4">{children}</th>;
}

function TableCell({ children }: { children: ReactNode }) {
  return <td className="border-b border-[var(--splity-line)] px-5 py-4 text-sm font-semibold text-[var(--splity-ink)]">{children}</td>;
}

function statusDotClass(status: StatusFilter) {
  if (status === "settled") return "bg-[var(--splity-mint)]";
  if (status === "settling") return "bg-[var(--splity-gold-strong)]";
  return "bg-[var(--splity-rose)]";
}

function statusBadgeClass(status: StatusFilter) {
  if (status === "settled") return "bg-emerald-50 text-[var(--splity-mint)]";
  if (status === "settling") return "bg-amber-50 text-[var(--splity-gold-strong)]";
  return "bg-red-50 text-[var(--splity-rose)]";
}

function Pagination({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        aria-label={t("groupsView.previousPage")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] disabled:opacity-40"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
        <button
          className={[
            "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-bold transition",
            currentPage === page
              ? "bg-[var(--splity-navy)] text-white"
              : "border border-[var(--splity-line)] bg-white text-[var(--splity-ink)] hover:bg-[var(--splity-bg)]",
          ].join(" ")}
          key={page}
          onClick={() => onPageChange(page)}
          type="button"
        >
          {page}
        </button>
      ))}
      <button
        aria-label={t("groupsView.nextPage")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--splity-line)] bg-white text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] disabled:opacity-40"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function NoSearchResults() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--splity-line-strong)] bg-white/45 p-10 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--splity-navy)] text-[var(--splity-gold)]">
        <Search className="h-5 w-5" />
      </span>
      <h2 className="mt-5 text-2xl font-bold">
        <T k="groupsView.noResultsTitle" />
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--splity-muted)]">
        <T k="groupsView.noResultsBody" />
      </p>
    </div>
  );
}
