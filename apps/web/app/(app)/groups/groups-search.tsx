"use client";

import { Search, X } from "lucide-react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useTranslation } from "@/lib/i18n";
import type { SortMode, StatusFilter } from "./types";

export type GroupsViewMode = "grid" | "list";

type GroupsSearchContextValue = {
  query: string;
  setQuery: (query: string) => void;
  status: StatusFilter;
  setStatus: (status: StatusFilter) => void;
  sort: SortMode;
  setSort: (sort: SortMode) => void;
  view: GroupsViewMode;
  setView: (view: GroupsViewMode) => void;
};

const GroupsSearchContext = createContext<GroupsSearchContextValue | null>(null);

export function useGroupsSearch() {
  const context = useContext(GroupsSearchContext);

  if (!context) {
    throw new Error("useGroupsSearch must be used within GroupsSearchProvider.");
  }

  return context;
}

export function GroupsSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [view, setView] = useState<GroupsViewMode>("grid");
  const value = useMemo(
    () => ({ query, setQuery, sort, setSort, status, setStatus, view, setView }),
    [query, sort, status, view]
  );

  return <GroupsSearchContext.Provider value={value}>{children}</GroupsSearchContext.Provider>;
}

export function LiveGroupSearch() {
  const { query, setQuery } = useGroupsSearch();
  const { t } = useTranslation();

  return (
    <div className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-3 shadow-[0_2px_8px_rgba(27,42,107,0.08)] transition focus-within:border-[var(--splity-navy)] focus-within:ring-4 focus-within:ring-[rgba(27,42,107,0.08)] sm:px-4">
      <Search className="h-4 w-4 shrink-0 text-[var(--splity-muted)]" />
      <input
        aria-label={t("groupsView.search")}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--splity-ink)] outline-none placeholder:text-[var(--splity-muted)] md:w-48 lg:w-64"
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("groupsView.search")}
        value={query}
      />
      {query ? (
        <button
          aria-label={t("groupsView.clearSearch")}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--splity-muted)] transition hover:bg-[var(--splity-bg)] hover:text-[var(--splity-ink)]"
          onClick={() => setQuery("")}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
