import { ArrowDownAZ } from "lucide-react";
import Link from "next/link";

import { T } from "@/components/i18n/t";

export function EmptyGroups() {
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
      <Link
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#087f6f] px-5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(8,127,111,0.18)] transition hover:bg-[#066c60]"
        href="/groups/create"
      >
        <T k="groupsView.createGroup" />
      </Link>
    </div>
  );
}
