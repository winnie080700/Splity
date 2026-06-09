import { Participant } from "@/lib/services/participants";
import { initials } from "@/lib/services/utils";
import { ReactNode } from "react";
import { T } from "../i18n/t";

export function TransferPerson({
  label,
  participant,
  status,
}: {
  label: ReactNode;
  participant?: Participant;
  status?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="splity-display inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--splity-navy)] text-sm font-extrabold text-white">
        {participant ? initials(participant.name) : "?"}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-rose)]">
          {label}
        </p>
        <p className="truncate font-bold text-[var(--splity-ink)]">
          {participant?.name ?? <T k="groupDetail.unknown" />}
        </p>
        <p className="truncate text-xs text-[var(--splity-muted)]">
          {participant?.username ? (
            `@${participant.username}`
          ) : (
            <T k="groups.manual" />
          )}
        </p>
        {status ? <div className="mt-2">{status}</div> : null}
      </div>
    </div>
  );
}
