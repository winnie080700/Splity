import Decimal from "decimal.js";

import {
  calculateTransfers,
  roundToCurrency,
  type NetBalance,
  type SettlementTransfer,
} from "./settlement-calculator";

export type SettlementParticipantRow = {
  id: string;
  name: string;
};

export type SettlementBillRow = {
  id: string;
  primary_payer_participant_id: string;
  transaction_date_utc: string;
  bill_shares?: { participant_id: string; total_share_amount: Decimal.Value }[] | null;
};

export type SettlementDateWindow = {
  fromDateUtc?: string | null;
  toDateUtc?: string | null;
};

export type SettlementSnapshot = {
  netBalances: NetBalance[];
  transfers: SettlementTransfer[];
};

function decimal(value: Decimal.Value) {
  return new Decimal(value);
}

function normalizeGuid(value: string) {
  return value.replaceAll("-", "").toLowerCase();
}

function moneyString(value: Decimal.Value) {
  return roundToCurrency(value).toFixed(2);
}

function inDateWindow(bill: SettlementBillRow, window?: SettlementDateWindow) {
  const billDate = new Date(bill.transaction_date_utc).getTime();
  if (window?.fromDateUtc && billDate < new Date(window.fromDateUtc).getTime()) return false;
  if (window?.toDateUtc && billDate > new Date(window.toDateUtc).getTime()) return false;
  return true;
}

export function buildSnapshotFromRows(
  participants: readonly SettlementParticipantRow[],
  bills: readonly SettlementBillRow[],
  dateWindow?: SettlementDateWindow
): SettlementSnapshot {
  const running = new Map(participants.map((participant) => [participant.id, decimal(0)]));

  for (const bill of bills.filter((row) => inDateWindow(row, dateWindow))) {
    for (const share of bill.bill_shares ?? []) {
      if (!running.has(share.participant_id)) continue;
      // SettlementsService.cs:177
      running.set(
        share.participant_id,
        roundToCurrency((running.get(share.participant_id) ?? decimal(0)).minus(share.total_share_amount))
      );
    }

    if (running.has(bill.primary_payer_participant_id)) {
      const billTotal = roundToCurrency(
        (bill.bill_shares ?? []).reduce((sum, share) => sum.plus(share.total_share_amount), decimal(0))
      );
      running.set(
        bill.primary_payer_participant_id,
        roundToCurrency((running.get(bill.primary_payer_participant_id) ?? decimal(0)).plus(billTotal))
      );
    }
  }

  const netBalances = [...running.entries()].map(([participantId, netAmount]) => ({
    participantId,
    netAmount: moneyString(netAmount),
  }));

  return {
    netBalances,
    transfers: calculateTransfers(netBalances),
  };
}

export function buildTransferKey(
  groupId: string,
  fromDateUtc: string | null | undefined,
  toDateUtc: string | null | undefined,
  transfer: Pick<SettlementTransfer, "fromParticipantId" | "toParticipantId" | "amount">
) {
  const fromPart = formatRoundTripDate(fromDateUtc);
  const toPart = formatRoundTripDate(toDateUtc);
  return [
    normalizeGuid(groupId),
    fromPart,
    toPart,
    normalizeGuid(transfer.fromParticipantId),
    normalizeGuid(transfer.toParticipantId),
    moneyString(transfer.amount),
  ].join(":");
}

export function getTransferFromSnapshot(
  snapshot: SettlementSnapshot,
  input: {
    fromParticipantId: string;
    toParticipantId: string;
    amount: Decimal.Value;
  }
) {
  const amount = moneyString(input.amount);
  const transfer = snapshot.transfers.find(
    (candidate) =>
      candidate.fromParticipantId === input.fromParticipantId &&
      candidate.toParticipantId === input.toParticipantId &&
      moneyString(candidate.amount) === amount
  );

  if (!transfer) {
    throw new SettlementTransferNotFoundError();
  }

  return transfer;
}

class SettlementTransferNotFoundError extends Error {
  constructor() {
    super("Settlement transfer not found for the current filters.");
    this.name = "SettlementTransferNotFoundError";
  }
}

function formatRoundTripDate(value: string | null | undefined) {
  if (!value) return "none";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new SettlementValidationDateError("Invalid settlement date.");
  }

  return date.toISOString().replace(/(\.\d{3})Z$/, "$10000Z");
}

class SettlementValidationDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementValidationDateError";
  }
}
