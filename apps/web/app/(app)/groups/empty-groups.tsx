import { ArrowDownAZ } from "lucide-react";

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
    </div>
  );
}
