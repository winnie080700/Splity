export const FEE_TYPE = {
  percentage: 1,
  fixed: 2,
} as const;

export const SPLIT_MODE = {
  equal: 1,
  weighted: 2,
} as const;

export type FeeType = (typeof FEE_TYPE)[keyof typeof FEE_TYPE];
export type SplitMode = (typeof SPLIT_MODE)[keyof typeof SPLIT_MODE];

type ParticipantSplitInput = {
  participantId: string;
  weight: string;
};

export type BillCalculationItemInput = {
  id?: string;
  description: string;
  amount: string;
  responsibleParticipantIds: string[];
};

export type BillCalculationFeeInput = {
  name: string;
  feeType: FeeType;
  value: string;
};

export type BillCalculationInput = {
  participantSplits: ParticipantSplitInput[];
  items: BillCalculationItemInput[];
  fees: BillCalculationFeeInput[];
  primaryPayerParticipantId: string;
};

type CalculatedShare = {
  participantId: string;
  weight: string;
  preFeeAmount: string;
  feeAmount: string;
  totalShareAmount: string;
};

export type CalculatedFee = {
  name: string;
  feeType: FeeType;
  value: string;
  appliedAmount: string;
};

export type BillComputationResult = {
  subtotalAmount: string;
  totalFeeAmount: string;
  grandTotalAmount: string;
  appliedFees: CalculatedFee[];
  shares: CalculatedShare[];
};
