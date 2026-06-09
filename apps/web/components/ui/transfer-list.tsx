import { Participant } from "@/lib/services/participants";
import { type SettlementResultDto } from "@/lib/services/settlements";
import { money } from "@/lib/services/utils";
import { ArrowRight } from "lucide-react";
import { T } from "../i18n/t";
import { TransferPerson } from "./transfer-person";
import { Badge } from "./badge";

function payerStatus(status: number) {
  return status === 0
    ? { key: "groupDetail.unpaid" as const, tone: "amber" as const }
    : { key: "groupDetail.paid" as const, tone: "green" as const };
}

function receiverStatus(status: number) {
  return status === 2
    ? { key: "settlements.status.received" as const, tone: "green" as const }
    : { key: "settlements.status.pending" as const, tone: "amber" as const };
}

export function TransfersList({
  participantById,
  settlement,
}: {
  participantById: Map<string, Participant>;
  settlement: SettlementResultDto | null;
}) {
  if (!settlement || settlement.transfers.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-[var(--splity-line-strong)] p-8 text-center text-sm font-medium text-[var(--splity-muted)]">
        <T k="settlements.everyoneBalanced" />
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-3">
      {settlement.transfers.map((transfer) => {
        const from = participantById.get(transfer.fromParticipantId);
        const to = participantById.get(transfer.toParticipantId);

        return (
          <div
            className="grid gap-4 rounded-2xl border border-[var(--splity-line)] bg-[var(--splity-bg)]/35 p-4 md:grid-cols-[1fr_auto_1fr_auto_auto] md:items-center"
            key={transfer.transferKey}>
            {(() => {
              const payer = payerStatus(transfer.status);
              return (
                <TransferPerson
                  label={<T k="groupDetail.pays" />}
                  participant={from}
                  status={
                    <Badge tone={payer.tone}>
                      <span className="uppercase">
                        <T k={payer.key} />
                      </span>
                    </Badge>
                  }
                />
              );
            })()}
            <div className="flex items-center justify-center gap-3 text-[var(--splity-muted)]">
              <span className="h-px w-12 bg-[var(--splity-line-strong)]" />
              <ArrowRight className="h-4 w-4" />
              <span className="h-px w-12 bg-[var(--splity-line-strong)]" />
            </div>
            {(() => {
              const receiver = receiverStatus(transfer.status);
              return (
                <TransferPerson
                  label={<T k="groupDetail.receives" />}
                  participant={to}
                  status={
                    <Badge tone={receiver.tone}>
                      <span className="uppercase">
                        <T k={receiver.key} />
                      </span>
                    </Badge>
                  }
                />
              );
            })()}
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--splity-muted)]">
                <T k="groupDetail.amount" />
              </p>
              <p className="splity-display mt-1 text-2xl font-extrabold text-[var(--splity-navy)]">
                {money(transfer.amount)}
              </p>
            </div>
            <div className="flex justify-end md:min-w-28">
              <Badge tone={receiverStatus(transfer.status).tone}>
                <span className="uppercase">
                  <T
                    k={
                      receiverStatus(transfer.status).key
                    }
                  />
                </span>
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
