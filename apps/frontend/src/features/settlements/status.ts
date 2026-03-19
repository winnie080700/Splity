import type { SettlementTransferDto, SettlementTransferStatus } from "@api-client";

export const SETTLEMENT_STATUS = {
  unpaid: 0 as SettlementTransferStatus,
  paid: 1 as SettlementTransferStatus,
  received: 2 as SettlementTransferStatus
} as const;

export function isSettlementUnpaid(status: SettlementTransferStatus) {
  return status === SETTLEMENT_STATUS.unpaid;
}

export function isSettlementPaid(status: SettlementTransferStatus) {
  return status === SETTLEMENT_STATUS.paid;
}

export function isSettlementReceived(status: SettlementTransferStatus) {
  return status === SETTLEMENT_STATUS.received;
}

export function getPayerFacingStatus(transfers: SettlementTransferDto[]) {
  if (transfers.some((transfer) => isSettlementUnpaid(transfer.status))) {
    return "unpaid" as const;
  }

  if (transfers.length > 0) {
    return "paid" as const;
  }

  return "none" as const;
}
