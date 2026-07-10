import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { T } from "@/components/i18n/t";
import type { GroupSummary } from "@/lib/services/groups";
import type { SettlementResultDto } from "@/lib/services/settlements";
import { formatDate, getStatusMeta, money } from "./utils";

type GroupCardProps = {
  currentParticipantId?: string;
  group: GroupSummary;
  settlement: SettlementResultDto | null;
};

export function GroupCard({ currentParticipantId, group, settlement }: GroupCardProps) {
  const meta = getStatusMeta(group);
  const balance = currentParticipantId
    ? settlement?.netBalances.find((entry) => entry.participantId === currentParticipantId)?.netAmount
    : null;
  const balanceValue = Number(balance ?? 0);

  return (
    <article className="group relative block min-h-[300px] w-full overflow-hidden rounded-3xl border border-[var(--splity-line)] bg-white p-7 shadow-[0_10px_30px_rgba(12,21,56,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(12,21,56,0.10)]">
      <span className={`absolute inset-y-0 left-0 w-1 ${meta.accent}`} />
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-extrabold tracking-tight text-[var(--splity-ink)]">
            {group.name}
          </h2>
          <p className="mt-2 text-sm font-semibold text-[var(--splity-muted)]">
            <T k="common.created" values={{ date: formatDate(group.created_at_utc) }} />
          </p>
        </div>
        <span className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-extrabold ${meta.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.accent}`} />
          <T k={meta.labelKey} />
        </span>
      </div>

      <div className="mt-7 border-t border-dashed border-[var(--splity-line-strong)] pt-6">
        <div className="grid grid-cols-2 gap-7">
          <Stat label={<T k="groups.participants" />} suffix={<T k="groupsView.people" />} value={group.participantCount} />
          <Stat label={<T k="groups.bills" />} suffix={<T k="groupsView.logged" />} value={group.billCount} />
        </div>
        <div className="mt-6 border-t border-[var(--splity-line)] pt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[var(--splity-muted)]">
                <T k="groupsView.balance" />
              </div>
              <div
                className={[
                  "mt-1 text-xl font-extrabold",
                  balanceValue > 0
                    ? "text-[var(--splity-mint)]"
                    : balanceValue < 0
                      ? "text-[var(--splity-rose)]"
                      : "text-[var(--splity-mint)]",
                ].join(" ")}
              >
                {money(balanceValue)}
              </div>
            </div>
            <Link
              aria-label={group.name}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--splity-ink)] transition hover:bg-[var(--splity-bg)]"
              href={`/groups/${group.id}`}
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, suffix, value }: { label: ReactNode; suffix: ReactNode; value: number }) {
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
