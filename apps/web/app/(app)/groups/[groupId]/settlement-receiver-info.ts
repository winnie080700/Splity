import type { Participant } from "@/lib/services/participants";
import type { SettlementResultDto } from "@/lib/services/settlements";
import { listGroupUserPaymentProfiles } from "@/lib/services/users";
import type { SettlementReceiverInfo } from "./share-settlement-modal";

export async function buildSettlementReceiverInfos(
  groupId: string,
  participants: Participant[],
  settlement: SettlementResultDto | null
): Promise<SettlementReceiverInfo[]> {
  if (!settlement) return [];

  const participantById = new Map(
    participants.map((participant) => [participant.id, participant])
  );
  const receiverIds = Array.from(
    new Set(settlement.transfers.map((transfer) => transfer.toParticipantId))
  );
  const invitedUserIds = receiverIds
    .map((participantId) => participantById.get(participantId)?.invited_user_id)
    .filter((id): id is string => Boolean(id));
  const profiles = await listGroupUserPaymentProfiles(groupId, invitedUserIds);

  return receiverIds.map((participantId) => {
    const participant = participantById.get(participantId);
    const profile = participant?.invited_user_id
      ? profiles.get(participant.invited_user_id)
      : null;
    const incomingTransfers = settlement.transfers.filter(
      (transfer) => transfer.toParticipantId === participantId
    );

    return {
      accountName: profile?.accountName ?? "",
      accountNumber: profile?.accountNumber ?? "",
      incomingCount: incomingTransfers.length,
      locked: Boolean(participant?.invited_user_id),
      notes: profile?.notes ?? "",
      paidCount: incomingTransfers.filter((transfer) => transfer.status === 2).length,
      participantId,
      paymentMethod: profile?.paymentMethod ?? "",
      paymentQrDataUrl: profile?.paymentQrDataUrl ?? "",
      receiverName: profile?.payeeName ?? participant?.name ?? "",
    };
  });
}
