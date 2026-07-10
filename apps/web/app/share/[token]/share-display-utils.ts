import type { MessageKey } from "@/lib/i18n";
import type { PublicSettlementShare } from "@/lib/services/settlement-shares";

export type Identity = {
  id: string;
  name: string;
};

export type IdentitySummary = Identity & {
  incoming: number;
  net: number;
  outgoing: number;
  roleKey: MessageKey;
};

export function identitySummary(
  share: Pick<PublicSettlementShare, "transfers">,
  identity: Identity
): IdentitySummary {
  const outgoing = share.transfers
    .filter((transfer) => transfer.from_participant_id === identity.id)
    .reduce((total, transfer) => total + Number(transfer.amount), 0);
  const incoming = share.transfers
    .filter((transfer) => transfer.to_participant_id === identity.id)
    .reduce((total, transfer) => total + Number(transfer.amount), 0);

  return {
    ...identity,
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
