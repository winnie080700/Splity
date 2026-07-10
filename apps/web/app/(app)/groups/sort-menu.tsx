"use client";

import { ArrowUpDown, Check } from "lucide-react";

import { T } from "@/components/i18n/t";
import type { MessageKey } from "@/lib/i18n";
import type { SortMode } from "./types";
import { useGroupsSearch } from "./groups-search";

const sortLabelKeys: Record<SortMode, MessageKey> = {
  name: "groupsView.sortName",
  newest: "groupsView.sortNewest",
  oldest: "groupsView.sortOldest",
};

export function SortMenu() {
  const { setSort, sort } = useGroupsSearch();

  return (
    <details className="group relative">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-[var(--splity-line)] bg-white px-3 text-sm font-bold text-[var(--splity-ink)] transition hover:border-[var(--splity-line-strong)]">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--splity-muted)]">
          <T k="groupsView.sort" />
        </span>
        <T k={sortLabelKeys[sort]} />
        <ArrowUpDown className="h-3.5 w-3.5 text-[var(--splity-muted)]" />
      </summary>
      <div className="absolute right-0 z-10 mt-2 grid w-36 overflow-hidden rounded-xl border border-[var(--splity-line)] bg-white p-1 text-sm font-semibold shadow-lg">
        {(["newest", "oldest", "name"] as SortMode[]).map((mode) => (
          <button
            className="flex h-9 items-center justify-between rounded-lg px-3 text-left text-[var(--splity-ink)] hover:bg-[var(--splity-bg)]"
            key={mode}
            onClick={() => setSort(mode)}
            type="button"
          >
            <T k={sortLabelKeys[mode]} />
            {sort === mode ? <Check className="h-3.5 w-3.5" /> : null}
          </button>
        ))}
      </div>
    </details>
  );
}
