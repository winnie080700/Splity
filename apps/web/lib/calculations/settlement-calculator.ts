import Decimal from "decimal.js";

export type NetBalance = {
  participantId: string;
  netAmount: Decimal.Value;
};

export type SettlementTransfer = {
  fromParticipantId: string;
  toParticipantId: string;
  amount: string;
};

export class SettlementValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementValidationError";
  }
}

const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

function decimal(value: Decimal.Value) {
  return new Decimal(value);
}

function compareParticipantId(left: string, right: string) {
  return normalizeGuid(left).localeCompare(normalizeGuid(right));
}

function normalizeGuid(value: string) {
  return value.replaceAll("-", "").toLowerCase();
}

function moneyStringFromCents(cents: number) {
  return decimal(cents).div(100).toFixed(2);
}

export function calculateTransfers(netBalances: readonly NetBalance[]): SettlementTransfer[] {
  if (!netBalances) {
    throw new TypeError("netBalances is required.");
  }

  // SettlementCalculator.cs:11
  const sum = toCents(netBalances.reduce((total, balance) => total.plus(balance.netAmount), decimal(0)));
  if (sum !== 0) {
    throw new SettlementValidationError("Net balances must sum to zero.");
  }

  const outstanding = netBalances.map((balance) => ({
    participantId: balance.participantId,
    // SettlementCalculator.cs:18,25
    amountInCents: toCents(balance.netAmount),
  }));

  const creditors = outstanding
    .filter((entry) => entry.amountInCents > 0)
    .sort((left, right) => {
      const amountCompare = right.amountInCents - left.amountInCents;
      return amountCompare === 0 ? compareParticipantId(left.participantId, right.participantId) : amountCompare;
    });

  const debtors = outstanding
    .filter((entry) => entry.amountInCents < 0)
    .map((entry) => ({ participantId: entry.participantId, amountInCents: -entry.amountInCents }))
    .sort((left, right) => {
      const amountCompare = right.amountInCents - left.amountInCents;
      return amountCompare === 0 ? compareParticipantId(left.participantId, right.participantId) : amountCompare;
    });

  const transfers: SettlementTransfer[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.amountInCents, debtor.amountInCents);
    if (amount <= 0) break;

    transfers.push({
      fromParticipantId: debtor.participantId,
      toParticipantId: creditor.participantId,
      amount: moneyStringFromCents(amount),
    });

    creditor.amountInCents -= amount;
    debtor.amountInCents -= amount;

    if (creditor.amountInCents === 0) creditorIndex++;
    if (debtor.amountInCents === 0) debtorIndex++;
  }

  return transfers;
}

function toCents(amount: Decimal.Value) {
  // SettlementCalculator.cs:66
  const cents = decimal(amount).mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  if (cents.lt(INT_MIN) || cents.gt(INT_MAX)) {
    throw new SettlementValidationError("amount out of cents range");
  }

  return cents.toNumber();
}

export function roundToCurrency(amount: Decimal.Value) {
  // SettlementsService.cs:302
  return decimal(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
