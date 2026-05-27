import { Users } from "lucide-react";
import type { ReactNode } from "react";

import { T } from "@/components/i18n/t";
import type { GroupSummary } from "@/lib/services/groups";
import type { SettlementResultDto } from "@/lib/services/settlements";
import { CardActions } from "./groups-client-controls";
import { avatarColors, formatDate, getStatusMeta, initials, money } from "./utils";

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
  const participants = settlement?.participants.slice(0, 5) ?? [];
  const balanceValue = Number(balance ?? 0);

  return (
    <article className="group relative block min-h-72 w-full overflow-hidden rounded-3xl border border-[var(--splity-line)] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(12,21,56,0.08)]">
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
          <Stat label={<T k="groups.participants" />} suffix={<T k="groupsView.people" />} value={group.participantCount} />
          <Stat label={<T k="groups.bills" />} suffix={<T k="groupsView.logged" />} value={group.billCount} />
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
