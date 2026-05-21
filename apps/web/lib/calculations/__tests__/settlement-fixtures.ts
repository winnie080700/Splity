import type { NetBalance, SettlementTransfer } from "../settlement-calculator";

const p1 = "00000000-0000-0000-0000-000000000001";
const p2 = "00000000-0000-0000-0000-000000000002";
const p3 = "00000000-0000-0000-0000-000000000003";
const p4 = "00000000-0000-0000-0000-000000000004";

function balance(participantId: string, netAmount: string): NetBalance {
  return { participantId, netAmount };
}

function transfer(fromParticipantId: string, toParticipantId: string, amount: string): SettlementTransfer {
  return { fromParticipantId, toParticipantId, amount };
}

export const SETTLEMENT_FIXTURES = [
  {
    id: "S01-simple-two-person",
    input: [balance(p1, "50.00"), balance(p2, "-50.00")],
    expected: [transfer(p2, p1, "50.00")],
  },
  {
    id: "S02-one-creditor-two-debtors",
    input: [balance(p1, "60.00"), balance(p2, "-30.00"), balance(p3, "-30.00")],
    expected: [transfer(p2, p1, "30.00"), transfer(p3, p1, "30.00")],
  },
  {
    id: "S03-two-creditors-two-debtors-three-transfers",
    input: [balance(p1, "50.00"), balance(p2, "10.00"), balance(p3, "-30.00"), balance(p4, "-30.00")],
    expected: [transfer(p3, p1, "30.00"), transfer(p4, p1, "20.00"), transfer(p4, p2, "10.00")],
  },
  {
    id: "S04-cent-remainder",
    input: [balance(p1, "70.66"), balance(p2, "-35.33"), balance(p3, "-35.33")],
    expected: [transfer(p2, p1, "35.33"), transfer(p3, p1, "35.33")],
  },
  {
    id: "S05-large-safe-amount",
    input: [balance(p1, "999999.99"), balance(p2, "-999999.99")],
    expected: [transfer(p2, p1, "999999.99")],
  },
  {
    id: "S06-tie-breakers-by-participant-id",
    input: [balance(p2, "10.00"), balance(p1, "10.00"), balance(p4, "-10.00"), balance(p3, "-10.00")],
    expected: [transfer(p3, p1, "10.00"), transfer(p4, p2, "10.00")],
  },
  {
    id: "S07-zero-net-excluded",
    input: [balance(p1, "25.00"), balance(p2, "0.00"), balance(p3, "-25.00")],
    expected: [transfer(p3, p1, "25.00")],
  },
  {
    id: "S08-all-zero",
    input: [balance(p1, "0.00"), balance(p2, "0.00"), balance(p3, "0.00")],
    expected: [],
  },
];

export const INVALID_SETTLEMENT_FIXTURES = [
  {
    id: "E01-non-zero-sum",
    input: [balance(p1, "10.00"), balance(p2, "-9.99")],
    message: "Net balances must sum to zero.",
  },
  {
    id: "E02-out-of-int-cents-range",
    input: [balance(p1, "10000000000.00"), balance(p2, "-10000000000.00")],
    message: "amount out of cents range",
  },
];

export const PARTICIPANTS = [
  { id: p1, name: "Alice" },
  { id: p2, name: "Bob" },
  { id: p3, name: "Carl" },
];

export { p1, p2, p3, p4 };
