import { FEE_TYPE, type BillCalculationInput, type BillComputationResult } from "../types";

const p1 = "00000000-0000-0000-0000-000000000001";
const p2 = "00000000-0000-0000-0000-000000000002";
const p3 = "00000000-0000-0000-0000-000000000003";
const p4 = "00000000-0000-0000-0000-000000000004";
const p5 = "00000000-0000-0000-0000-000000000005";
const p6 = "00000000-0000-0000-0000-000000000006";
const p7 = "00000000-0000-0000-0000-000000000007";

export type Fixture = {
  id: string;
  label: string;
  source: "csharp-test" | "csharp-runtime";
  input: BillCalculationInput;
  expected: BillComputationResult;
};

function split(participantId: string, weight = "1") {
  return { participantId, weight };
}

function share(
  participantId: string,
  weight: string,
  preFeeAmount: string,
  feeAmount: string,
  totalShareAmount: string
) {
  return { participantId, weight, preFeeAmount, feeAmount, totalShareAmount };
}

function contribution(participantId: string, amount: string) {
  return { participantId, amount };
}

export const FIXTURES: Fixture[] = [
  {
    id: "F01-equal-split-sst",
    label: "Equal split with 6% SST",
    source: "csharp-test",
    input: {
      participantSplits: [split(p1), split(p2), split(p3)],
      items: [{ description: "Groceries", amount: "100.00", responsibleParticipantIds: [p1, p2, p3] }],
      fees: [{ name: "SST", feeType: FEE_TYPE.percentage, value: "6.00" }],
      primaryPayerParticipantId: p1,
      extraContributions: [],
    },
    expected: {
      subtotalAmount: "100.00",
      totalFeeAmount: "6.00",
      grandTotalAmount: "106.00",
      appliedFees: [{ name: "SST", feeType: FEE_TYPE.percentage, value: "6.00", appliedAmount: "6.00" }],
      shares: [
        share(p1, "1.0000", "33.34", "2.00", "35.34"),
        share(p2, "1.0000", "33.33", "2.00", "35.33"),
        share(p3, "1.0000", "33.33", "2.00", "35.33"),
      ],
      contributions: [contribution(p1, "106.00"), contribution(p2, "0.00"), contribution(p3, "0.00")],
    },
  },
  {
    id: "F02-fixed-discount",
    label: "Equal split with fixed discount",
    source: "csharp-runtime",
    input: {
      participantSplits: [split(p1), split(p2), split(p3)],
      items: [{ description: "Groceries", amount: "100.00", responsibleParticipantIds: [p1, p2, p3] }],
      fees: [{ name: "Discount", feeType: FEE_TYPE.fixed, value: "-7.00" }],
      primaryPayerParticipantId: p1,
      extraContributions: [],
    },
    expected: {
      subtotalAmount: "100.00",
      totalFeeAmount: "-7.00",
      grandTotalAmount: "93.00",
      appliedFees: [{ name: "Discount", feeType: FEE_TYPE.fixed, value: "-7.00", appliedAmount: "-7.00" }],
      shares: [
        share(p1, "1.0000", "33.34", "-2.34", "31.00"),
        share(p2, "1.0000", "33.33", "-2.33", "31.00"),
        share(p3, "1.0000", "33.33", "-2.33", "31.00"),
      ],
      contributions: [contribution(p1, "93.00"), contribution(p2, "0.00"), contribution(p3, "0.00")],
    },
  },
  {
    id: "F02-weighted-fixed-contribution",
    label: "Weighted split with fixed fee and prepayment",
    source: "csharp-test",
    input: {
      participantSplits: [split(p1, "2"), split(p2)],
      items: [{ description: "Dinner", amount: "90.00", responsibleParticipantIds: [p1, p2] }],
      fees: [{ name: "Service", feeType: FEE_TYPE.fixed, value: "9.00" }],
      primaryPayerParticipantId: p1,
      extraContributions: [contribution(p2, "20.00")],
    },
    expected: {
      subtotalAmount: "90.00",
      totalFeeAmount: "9.00",
      grandTotalAmount: "99.00",
      appliedFees: [{ name: "Service", feeType: FEE_TYPE.fixed, value: "9.00", appliedAmount: "9.00" }],
      shares: [share(p1, "2.0000", "60.00", "6.00", "66.00"), share(p2, "1.0000", "30.00", "3.00", "33.00")],
      contributions: [contribution(p1, "79.00"), contribution(p2, "20.00")],
    },
  },
  {
    id: "F03-seven-way-rounding",
    label: "100 split seven ways",
    source: "csharp-runtime",
    input: {
      participantSplits: [p1, p2, p3, p4, p5, p6, p7].map((id) => split(id)),
      items: [{ description: "Shared meal", amount: "100.00", responsibleParticipantIds: [p1, p2, p3, p4, p5, p6, p7] }],
      fees: [],
      primaryPayerParticipantId: p1,
      extraContributions: [],
    },
    expected: {
      subtotalAmount: "100.00",
      totalFeeAmount: "0.00",
      grandTotalAmount: "100.00",
      appliedFees: [],
      shares: [
        share(p1, "1.0000", "14.29", "0.00", "14.29"),
        share(p2, "1.0000", "14.29", "0.00", "14.29"),
        share(p3, "1.0000", "14.29", "0.00", "14.29"),
        share(p4, "1.0000", "14.29", "0.00", "14.29"),
        share(p5, "1.0000", "14.28", "0.00", "14.28"),
        share(p6, "1.0000", "14.28", "0.00", "14.28"),
        share(p7, "1.0000", "14.28", "0.00", "14.28"),
      ],
      contributions: [
        contribution(p1, "100.00"),
        contribution(p2, "0.00"),
        contribution(p3, "0.00"),
        contribution(p4, "0.00"),
        contribution(p5, "0.00"),
        contribution(p6, "0.00"),
        contribution(p7, "0.00"),
      ],
    },
  },
  {
    id: "F04-subset-weighted",
    label: "Subset responsibility with weights",
    source: "csharp-runtime",
    input: {
      participantSplits: [split(p1, "2"), split(p2), split(p3), split(p4, "4")],
      items: [{ description: "Taxi", amount: "48.50", responsibleParticipantIds: [p1, p4] }],
      fees: [],
      primaryPayerParticipantId: p4,
      extraContributions: [],
    },
    expected: {
      subtotalAmount: "48.50",
      totalFeeAmount: "0.00",
      grandTotalAmount: "48.50",
      appliedFees: [],
      shares: [
        share(p1, "2.0000", "16.17", "0.00", "16.17"),
        share(p2, "1.0000", "0.00", "0.00", "0.00"),
        share(p3, "1.0000", "0.00", "0.00", "0.00"),
        share(p4, "4.0000", "32.33", "0.00", "32.33"),
      ],
      contributions: [contribution(p1, "0.00"), contribution(p2, "0.00"), contribution(p3, "0.00"), contribution(p4, "48.50")],
    },
  },
  {
    id: "F05-multiple-fees",
    label: "Two percentage fees plus fixed fee",
    source: "csharp-runtime",
    input: {
      participantSplits: [split(p1), split(p2), split(p3, "2")],
      items: [{ description: "Food", amount: "123.45", responsibleParticipantIds: [p1, p2, p3] }],
      fees: [
        { name: "SST", feeType: FEE_TYPE.percentage, value: "6.00" },
        { name: "Service", feeType: FEE_TYPE.percentage, value: "10.00" },
        { name: "Parking", feeType: FEE_TYPE.fixed, value: "3.50" },
      ],
      primaryPayerParticipantId: p3,
      extraContributions: [],
    },
    expected: {
      subtotalAmount: "123.45",
      totalFeeAmount: "23.26",
      grandTotalAmount: "146.71",
      appliedFees: [
        { name: "SST", feeType: FEE_TYPE.percentage, value: "6.00", appliedAmount: "7.41" },
        { name: "Service", feeType: FEE_TYPE.percentage, value: "10.00", appliedAmount: "12.35" },
        { name: "Parking", feeType: FEE_TYPE.fixed, value: "3.50", appliedAmount: "3.50" },
      ],
      shares: [
        share(p1, "1.0000", "30.86", "5.82", "36.68"),
        share(p2, "1.0000", "30.86", "5.81", "36.67"),
        share(p3, "2.0000", "61.73", "11.63", "73.36"),
      ],
      contributions: [contribution(p1, "0.00"), contribution(p2, "0.00"), contribution(p3, "146.71")],
    },
  },
  {
    id: "F06-single-participant",
    label: "Single participant pays all",
    source: "csharp-runtime",
    input: {
      participantSplits: [split(p1)],
      items: [{ description: "Coffee", amount: "12.34", responsibleParticipantIds: [p1] }],
      fees: [{ name: "SST", feeType: FEE_TYPE.percentage, value: "6.00" }],
      primaryPayerParticipantId: p1,
      extraContributions: [],
    },
    expected: {
      subtotalAmount: "12.34",
      totalFeeAmount: "0.74",
      grandTotalAmount: "13.08",
      appliedFees: [{ name: "SST", feeType: FEE_TYPE.percentage, value: "6.00", appliedAmount: "0.74" }],
      shares: [share(p1, "1.0000", "12.34", "0.74", "13.08")],
      contributions: [contribution(p1, "13.08")],
    },
  },
  {
    id: "F07-large-weight-ratio",
    label: "Large amount with 1:99 weights",
    source: "csharp-runtime",
    input: {
      participantSplits: [split(p1), split(p2, "99")],
      items: [{ description: "Hotel", amount: "9999.99", responsibleParticipantIds: [p1, p2] }],
      fees: [{ name: "Tax", feeType: FEE_TYPE.percentage, value: "8.25" }],
      primaryPayerParticipantId: p2,
      extraContributions: [],
    },
    expected: {
      subtotalAmount: "9999.99",
      totalFeeAmount: "825.00",
      grandTotalAmount: "10824.99",
      appliedFees: [{ name: "Tax", feeType: FEE_TYPE.percentage, value: "8.25", appliedAmount: "825.00" }],
      shares: [share(p1, "1.0000", "100.00", "8.25", "108.25"), share(p2, "99.0000", "9899.99", "816.75", "10716.74")],
      contributions: [contribution(p1, "0.00"), contribution(p2, "10824.99")],
    },
  },
  {
    id: "F08-multiple-contributors",
    label: "Multiple extra contributors",
    source: "csharp-runtime",
    input: {
      participantSplits: [split(p1), split(p2), split(p3)],
      items: [{ description: "Supplies", amount: "75.00", responsibleParticipantIds: [p1, p2, p3] }],
      fees: [],
      primaryPayerParticipantId: p3,
      extraContributions: [contribution(p1, "30.00"), contribution(p2, "20.00")],
    },
    expected: {
      subtotalAmount: "75.00",
      totalFeeAmount: "0.00",
      grandTotalAmount: "75.00",
      appliedFees: [],
      shares: [
        share(p1, "1.0000", "25.00", "0.00", "25.00"),
        share(p2, "1.0000", "25.00", "0.00", "25.00"),
        share(p3, "1.0000", "25.00", "0.00", "25.00"),
      ],
      contributions: [contribution(p1, "30.00"), contribution(p2, "20.00"), contribution(p3, "25.00")],
    },
  },
  {
    id: "F09-contributions-equal-total",
    label: "Extra contributions equal grand total",
    source: "csharp-runtime",
    input: {
      participantSplits: [split(p1), split(p2)],
      items: [{ description: "Tickets", amount: "50.00", responsibleParticipantIds: [p1, p2] }],
      fees: [],
      primaryPayerParticipantId: p1,
      extraContributions: [contribution(p1, "25.00"), contribution(p2, "25.00")],
    },
    expected: {
      subtotalAmount: "50.00",
      totalFeeAmount: "0.00",
      grandTotalAmount: "50.00",
      appliedFees: [],
      shares: [share(p1, "1.0000", "25.00", "0.00", "25.00"), share(p2, "1.0000", "25.00", "0.00", "25.00")],
      contributions: [contribution(p1, "25.00"), contribution(p2, "25.00")],
    },
  },
  {
    id: "F10-multiple-items-subsets",
    label: "Multiple items with different responsibility subsets",
    source: "csharp-runtime",
    input: {
      participantSplits: [split(p1), split(p2, "2"), split(p3, "3")],
      items: [
        { description: "Brunch", amount: "60.00", responsibleParticipantIds: [p1, p2, p3] },
        { description: "Dessert", amount: "15.99", responsibleParticipantIds: [p1, p3] },
        { description: "Drinks", amount: "21.10", responsibleParticipantIds: [p2, p3] },
      ],
      fees: [{ name: "Service", feeType: FEE_TYPE.percentage, value: "10.00" }],
      primaryPayerParticipantId: p2,
      extraContributions: [],
    },
    expected: {
      subtotalAmount: "97.09",
      totalFeeAmount: "9.71",
      grandTotalAmount: "106.80",
      appliedFees: [{ name: "Service", feeType: FEE_TYPE.percentage, value: "10.00", appliedAmount: "9.71" }],
      shares: [
        share(p1, "1.0000", "14.00", "1.40", "15.40"),
        share(p2, "2.0000", "28.44", "2.84", "31.28"),
        share(p3, "3.0000", "54.65", "5.47", "60.12"),
      ],
      contributions: [contribution(p1, "0.00"), contribution(p2, "106.80"), contribution(p3, "0.00")],
    },
  },
];

export const INVALID_FIXTURES = [
  {
    id: "E01-negative-percentage-fee",
    input: { ...FIXTURES[0].input, fees: [{ name: "Bad fee", feeType: FEE_TYPE.percentage, value: "-1.00" }] },
    message: "Percentage fee value must be zero or greater.",
  },
  {
    id: "E02-contribution-exceeds-total",
    input: { ...FIXTURES[0].input, extraContributions: [contribution(p2, "200.00")] },
    message: "Contribution total cannot exceed bill grand total.",
  },
  {
    id: "E03-zero-weight",
    input: { ...FIXTURES[0].input, participantSplits: [split(p1, "0"), split(p2), split(p3)] },
    message: "Participant weight must be greater than zero.",
  },
  {
    id: "E04-empty-responsibilities",
    input: {
      ...FIXTURES[0].input,
      items: [{ description: "No owners", amount: "10.00", responsibleParticipantIds: [] }],
    },
    message: "Each bill item must have at least one responsible participant.",
  },
];
