import { SETTLEMENT_TRANSFER_STATUS } from "../../../lib/domain/status";

import type { MessageKey } from "@/lib/i18n";
import type { PublicSettlementShare } from "@/lib/services/settlement-shares";

export type Identity = {
  id: string;
  name: string;
};

export type IdentitySummary = Identity & {
  completed: boolean;
  incoming: number;
  net: number;
  outgoing: number;
  roleKey: MessageKey;
};

export function identitySummary(
  share: Pick<PublicSettlementShare, "transfers">,
  identity: Identity
): IdentitySummary {
  const relatedTransfers = share.transfers.filter(
    (transfer) =>
      transfer.from_participant_id === identity.id || transfer.to_participant_id === identity.id
  );
  const outgoing = relatedTransfers
    .filter((transfer) => transfer.from_participant_id === identity.id)
    .reduce((total, transfer) => total + Number(transfer.amount), 0);
  const incoming = relatedTransfers
    .filter((transfer) => transfer.to_participant_id === identity.id)
    .reduce((total, transfer) => total + Number(transfer.amount), 0);

  return {
    ...identity,
    completed:
      relatedTransfers.length > 0 &&
      relatedTransfers.every(
        (transfer) => transfer.status === SETTLEMENT_TRANSFER_STATUS.received
      ),
    incoming,
    net: incoming - outgoing,
    outgoing,
    roleKey:
      outgoing && incoming
        ? "share.roleBoth"
        : outgoing
          ? "settlements.role.payer"
          : incoming
            ? "settlements.role.receiver"
            : "share.roleSettled",
  };
}
