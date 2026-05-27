import type { BillDetail } from "@/lib/calculations/bill-read-projection";
import type { Participant } from "@/lib/services/participants";
import type { SettlementResultDto, SettlementTransferDto } from "@/lib/services/settlements";
import { formatTableDate, money } from "@/lib/services/utils";

export type ParticipantSettlementRole = "balanced" | "payer" | "receiver";
export type ParticipantPaymentStatus = "balanced" | "markedPaid" | "pending" | "received";

export type ParticipantSettlementBill = {
  date: string;
  id: string;
  items: {
    amount: string;
    description: string;
    involved: boolean;
    participants: string[];
  }[];
  payer: string;
  participantContribution: string;
  participantShare: string;
  storeName: string;
  total: string;
};

type ParticipantSettlementTransfer = {
  amount: string;
  direction: "pay" | "receive";
  otherName: string;
  status: number;
};

export type ParticipantSettlementCard = {
  billCount: number;
  bills: ParticipantSettlementBill[];
  name: string;
  netAmount: string;
  paymentStatus: ParticipantPaymentStatus;
  participantId: string;
  role: ParticipantSettlementRole;
  transferCount: number;
  transfers: ParticipantSettlementTransfer[];
};

function participantName(participantsById: Map<string, Participant>, participantId: string) {
  return participantsById.get(participantId)?.name ?? "";
}

function roleFromNetAmount(netAmount: string): ParticipantSettlementRole {
  const value = Number(netAmount);
  if (value < 0) return "payer";
  if (value > 0) return "receiver";
  return "balanced";
}

function paymentStatusFromTransfers(transfers: ParticipantSettlementTransfer[]): ParticipantPaymentStatus {
  if (!transfers.length) return "balanced";
  if (transfers.every((transfer) => transfer.status === 2)) return "received";
  if (transfers.some((transfer) => transfer.status === 1)) return "markedPaid";
  return "pending";
}

function transferForParticipant(
  transfer: SettlementTransferDto,
  participantId: string,
  participantsById: Map<string, Participant>
): ParticipantSettlementTransfer | null {
  if (transfer.fromParticipantId === participantId) {
    return {
      amount: money(transfer.amount),
      direction: "pay",
      otherName: participantName(participantsById, transfer.toParticipantId),
      status: transfer.status,
    };
  }

  if (transfer.toParticipantId === participantId) {
    return {
      amount: money(transfer.amount),
      direction: "receive",
      otherName: participantName(participantsById, transfer.fromParticipantId),
      status: transfer.status,
    };
  }

  return null;
}

function billForParticipant(
  bill: BillDetail,
  participantId: string,
  participantsById: Map<string, Participant>
): ParticipantSettlementBill | null {
  const share = bill.shares.find((item) => item.participantId === participantId);
  const contribution = bill.contributions.find((item) => item.participantId === participantId);
  const isPrimaryPayer = bill.primaryPayerParticipantId === participantId;
  const participantItems = bill.items.filter((item) =>
    item.responsibleParticipantIds.includes(participantId)
  );

  if (!share && !contribution && !isPrimaryPayer && !participantItems.length) {
    return null;
  }

  return {
    date: formatTableDate(bill.transactionDateUtc),
    id: bill.id,
    items: bill.items.map((item) => ({
      amount: money(item.amount, bill.currencyCode),
      description: item.description,
      involved: item.responsibleParticipantIds.includes(participantId),
      participants: item.responsibleParticipantIds
        .map((responsibleParticipantId) =>
          participantName(participantsById, responsibleParticipantId)
        )
        .filter(Boolean),
    })),
    payer: participantName(participantsById, bill.primaryPayerParticipantId),
    participantContribution: money(contribution?.amount ?? "0", bill.currencyCode),
    participantShare: money(share?.totalShareAmount ?? "0", bill.currencyCode),
    storeName: bill.storeName,
    total: money(bill.grandTotalAmount, bill.currencyCode),
  };
}

export function buildParticipantSettlementCards({
  bills,
  participants,
  settlement,
}: {
  bills: BillDetail[];
  participants: Participant[];
  settlement: SettlementResultDto | null;
}): ParticipantSettlementCard[] {
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const balanceByParticipantId = new Map(
    (settlement?.netBalances ?? []).map((balance) => [balance.participantId, balance.netAmount])
  );

  return participants.map((participant) => {
    const netAmount = balanceByParticipantId.get(participant.id) ?? "0.00";
    const transfers = (settlement?.transfers ?? [])
      .map((transfer) => transferForParticipant(transfer, participant.id, participantsById))
      .filter((transfer): transfer is ParticipantSettlementTransfer => Boolean(transfer));
    const participantBills = bills
      .map((bill) => billForParticipant(bill, participant.id, participantsById))
      .filter((bill): bill is ParticipantSettlementBill => Boolean(bill));

    return {
      billCount: participantBills.length,
      bills: participantBills,
      name: participant.name,
      netAmount: money(netAmount),
      paymentStatus: paymentStatusFromTransfers(transfers),
      participantId: participant.id,
      role: roleFromNetAmount(netAmount),
      transferCount: transfers.length,
      transfers,
    };
  });
}
