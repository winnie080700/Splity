import Decimal from "decimal.js";

import { FEE_TYPE, type BillCalculationInput, type BillComputationResult, type BillCalculationFeeInput } from "./types";

type DecimalByParticipant = Map<string, Decimal>;

export class BillValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillValidationError";
  }
}

function money(value: Decimal.Value) {
  return new Decimal(value);
}

function toMoneyString(value: Decimal.Value) {
  return roundToCurrency(value).toFixed(2);
}

function toWeightString(value: Decimal.Value) {
  return new Decimal(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
}

function compareParticipantId(left: string, right: string) {
  return left.localeCompare(right);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function calculateBillShares(input: BillCalculationInput): BillComputationResult {
  if (input.participantSplits.length === 0) {
    throw new BillValidationError("At least one participant is required.");
  }

  if (input.items.length === 0) {
    throw new BillValidationError("At least one bill item is required.");
  }

  if (!input.participantSplits.some((split) => split.participantId === input.primaryPayerParticipantId)) {
    throw new BillValidationError("Primary payer must be part of bill participants.");
  }

  for (const item of input.items) {
    if (!item.description.trim()) {
      throw new BillValidationError("Bill item description is required.");
    }

    if (money(item.amount).lte(0)) {
      throw new BillValidationError("Bill item amount must be greater than zero.");
    }

    const responsibleParticipantIds = unique(item.responsibleParticipantIds);
    if (responsibleParticipantIds.length === 0) {
      throw new BillValidationError("Each bill item must have at least one responsible participant.");
    }

    if (responsibleParticipantIds.length !== item.responsibleParticipantIds.length) {
      throw new BillValidationError("Duplicate responsible participants are not allowed for a bill item.");
    }

    if (
      responsibleParticipantIds.some((participantId) =>
        input.participantSplits.every((split) => split.participantId !== participantId)
      )
    ) {
      throw new BillValidationError("Responsible item participants must be part of bill participants.");
    }
  }

  for (const split of input.participantSplits) {
    if (money(split.weight).lte(0)) {
      throw new BillValidationError("Participant weight must be greater than zero.");
    }
  }

  for (const fee of input.fees) {
    if (!fee.name.trim()) {
      throw new BillValidationError("Fee name is required.");
    }

    if (fee.feeType === FEE_TYPE.percentage && money(fee.value).lt(0)) {
      throw new BillValidationError("Percentage fee value must be zero or greater.");
    }
  }

  // BillCalculator.cs:80
  const subtotal = roundToCurrency(input.items.reduce((sum, item) => sum.plus(item.amount), money(0)));
  const appliedFees = calculateAppliedFees(subtotal, input.fees);
  // BillCalculator.cs:82
  const totalFee = roundToCurrency(appliedFees.reduce((sum, fee) => sum.plus(fee.appliedAmount), money(0)));
  // BillCalculator.cs:83
  const grandTotal = roundToCurrency(subtotal.plus(totalFee));

  const participantWeights = new Map(
    input.participantSplits.map((split) => [split.participantId, money(split.weight)])
  );
  const preFeeAllocations: DecimalByParticipant = new Map(
    input.participantSplits.map((split) => [split.participantId, money(0)])
  );

  for (const item of input.items) {
    const responsibleWeights = new Map<string, Decimal>();
    for (const participantId of unique(item.responsibleParticipantIds)) {
      const weight = participantWeights.get(participantId);
      if (!weight) throw new BillValidationError("Responsible item participants must be part of bill participants.");
      responsibleWeights.set(participantId, weight);
    }

    for (const [participantId, allocation] of allocateByWeight(item.amount, responsibleWeights)) {
      // BillCalculator.cs:102
      preFeeAllocations.set(participantId, roundToCurrency((preFeeAllocations.get(participantId) ?? money(0)).plus(allocation)));
    }
  }

  let feeAllocations: DecimalByParticipant;
  if (totalFee.eq(0)) {
    feeAllocations = new Map(input.participantSplits.map((split) => [split.participantId, money(0)]));
  } else if (subtotal.gt(0)) {
    feeAllocations = allocateByWeight(totalFee, preFeeAllocations);
  } else {
    feeAllocations = allocateByWeight(totalFee, participantWeights);
  }

  const shares = [...input.participantSplits]
    .sort((left, right) => compareParticipantId(left.participantId, right.participantId))
    .map((split) => {
      const preFeeAmount = preFeeAllocations.get(split.participantId) ?? money(0);
      const feeAmount = feeAllocations.get(split.participantId) ?? money(0);
      return {
        participantId: split.participantId,
        weight: toWeightString(split.weight),
        preFeeAmount: toMoneyString(preFeeAmount),
        feeAmount: toMoneyString(feeAmount),
        // BillCalculator.cs:127
        totalShareAmount: toMoneyString(preFeeAmount.plus(feeAmount)),
      };
    });

  return {
    subtotalAmount: toMoneyString(subtotal),
    totalFeeAmount: toMoneyString(totalFee),
    grandTotalAmount: toMoneyString(grandTotal),
    appliedFees: appliedFees.map((fee) => ({
      name: fee.name,
      feeType: fee.feeType,
      value: toMoneyString(fee.value),
      appliedAmount: toMoneyString(fee.appliedAmount),
    })),
    shares,
  };
}

function calculateAppliedFees(subtotal: Decimal, fees: BillCalculationFeeInput[]) {
  return fees.map((fee) => {
    let appliedAmount: Decimal;
    if (fee.feeType === FEE_TYPE.percentage) {
      // BillCalculator.cs:149
      appliedAmount = roundToCurrency(subtotal.mul(money(fee.value).div(100)));
    } else if (fee.feeType === FEE_TYPE.fixed) {
      // BillCalculator.cs:150
      appliedAmount = roundToCurrency(fee.value);
    } else {
      throw new BillValidationError("Unsupported fee type.");
    }

    return {
      name: fee.name,
      feeType: fee.feeType,
      value: money(fee.value),
      appliedAmount,
    };
  });
}

function allocateByWeight(totalAmount: Decimal.Value, weights: DecimalByParticipant): DecimalByParticipant {
  // BillCalculator.cs:202
  const roundedTotal = roundToCurrency(totalAmount);
  if (roundedTotal.lt(0)) {
    const positiveAllocations: DecimalByParticipant = allocateByWeight(roundedTotal.abs(), weights);
    return new Map(
      [...positiveAllocations.entries()].map(([participantId, amount]) => [participantId, amount.neg()])
    );
  }
  // BillCalculator.cs:203
  const totalCents = toCents(roundedTotal);
  const totalWeight = [...weights.values()].reduce((sum, weight) => sum.plus(weight), money(0));
  if (totalWeight.lte(0)) {
    throw new BillValidationError("Total weight must be greater than zero.");
  }

  const allocations = new Map<string, number>();
  const remainders: { participantId: string; remainder: Decimal }[] = [];
  let allocatedCents = 0;

  for (const [participantId, weight] of weights.entries()) {
    const exactCents = money(totalCents).mul(weight).div(totalWeight);
    const floorCents = exactCents.floor().toNumber();
    allocations.set(participantId, floorCents);
    allocatedCents += floorCents;
    remainders.push({ participantId, remainder: exactCents.minus(floorCents) });
  }

  const centsToDistribute = totalCents - allocatedCents;
  for (const { participantId } of remainders
    .sort((left, right) => {
      const remainderCompare = right.remainder.comparedTo(left.remainder);
      return remainderCompare === 0 ? compareParticipantId(left.participantId, right.participantId) : remainderCompare;
    })
    .slice(0, centsToDistribute)) {
    allocations.set(participantId, (allocations.get(participantId) ?? 0) + 1);
  }

  return new Map([...allocations.entries()].map(([participantId, cents]) => [participantId, money(cents).div(100)]));
}

function toCents(amount: Decimal.Value) {
  // BillCalculator.cs:240
  return money(amount).mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export function roundToCurrency(amount: Decimal.Value) {
  // BillCalculator.cs:245
  return money(amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
