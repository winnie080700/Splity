import { type BillDetailDto, type BillFeeDto } from "@api-client";

export type SettlementReceiptPerspective = "payable" | "receivable";

export type SettlementReceiptLineTone = "default" | "muted" | "accent";

export type SettlementReceiptLine = {
  id: string;
  label: string;
  amount: number;
  tone?: SettlementReceiptLineTone;
};

export type SettlementReceiptBill = {
  id: string;
  storeName: string;
  transactionDateUtc: string;
  lines: SettlementReceiptLine[];
  totalAmount: number;
};

export type SettlementReceiptData = {
  bills: SettlementReceiptBill[];
  grandTotal: number;
};

type UnsignedReceiptLine = {
  id: string;
  label: string;
  amountCents: number;
  tone?: SettlementReceiptLineTone;
};

export function buildSettlementReceiptData({
  bills,
  participantId,
  perspective,
  expectedTotalAmount,
  t
}: {
  bills: BillDetailDto[];
  participantId: string;
  perspective: SettlementReceiptPerspective;
  expectedTotalAmount?: number;
  t: (key: any) => string;
}): SettlementReceiptData {
  const scopedBills = bills
    .map((bill) => buildScopedReceiptBill({ bill, participantId, perspective, t }))
    .filter((bill): bill is SettlementReceiptBill => bill !== null)
    .sort((left, right) => new Date(right.transactionDateUtc).getTime() - new Date(left.transactionDateUtc).getTime());

  const receipt = {
    bills: scopedBills,
    grandTotal: fromCents(scopedBills.reduce((sum, bill) => sum + toCents(bill.totalAmount), 0))
  };

  return typeof expectedTotalAmount === "number"
    ? alignReceiptGrandTotal(receipt, expectedTotalAmount, t("settlement.shareReceiptRounding"))
    : receipt;
}

function buildScopedReceiptBill({
  bill,
  participantId,
  perspective,
  t
}: {
  bill: BillDetailDto;
  participantId: string;
  perspective: SettlementReceiptPerspective;
  t: (key: any) => string;
}) {
  const share = bill.shares.find((entry) => entry.participantId === participantId);
  const contributionCents = bill.contributions
    .filter((entry) => entry.participantId === participantId)
    .reduce((sum, entry) => sum + toCents(entry.amount), 0);

  if (!share && contributionCents === 0) {
    return null;
  }

  const weightByParticipantId = new Map(bill.shares.map((entry) => [entry.participantId, entry.weight]));
  const participantItemTotals = new Map(bill.shares.map((entry) => [entry.participantId, 0]));

  const itemLines: UnsignedReceiptLine[] = [];
  for (const item of bill.items) {
    const responsibleIds = Array.from(new Set(item.responsibleParticipants.map((entry) => entry.participantId)))
      .filter((id) => weightByParticipantId.has(id));
    if (responsibleIds.length === 0) {
      continue;
    }

    const allocations = allocateCents(
      toCents(item.amount),
      responsibleIds.map((id) => [id, weightByParticipantId.get(id) ?? 0])
    );

    for (const [id, amountCents] of allocations.entries()) {
      participantItemTotals.set(id, (participantItemTotals.get(id) ?? 0) + amountCents);
    }

    const participantAmountCents = allocations.get(participantId) ?? 0;
    if (participantAmountCents > 0) {
      itemLines.push({
        id: `item:${item.id}`,
        label: item.description,
        amountCents: participantAmountCents
      });
    }
  }

  const balancedItemLines = rebalanceUnsignedLines(
    itemLines,
    toCents(share?.preFeeAmount ?? 0),
    t("settlement.shareReceiptScopedAmount")
  );

  const feeWeights = buildFeeWeights({
    participantItemTotals,
    shareWeights: weightByParticipantId,
    subtotalAmount: bill.subtotalAmount
  });

  const feeLines = bill.fees.map((fee) => {
    const allocations = allocateCents(
      toCents(fee.appliedAmount),
      Array.from(feeWeights.entries())
    );

    return {
      id: `fee:${fee.id}`,
      label: formatFeeLabel(fee, t),
      amountCents: allocations.get(participantId) ?? 0,
      tone: "muted" as const
    };
  });

  const balancedFeeLines = rebalanceUnsignedLines(
    feeLines.filter((line) => line.amountCents > 0),
    toCents(share?.feeAmount ?? 0),
    t("settlement.shareReceiptFee")
  );

  const receiptLines: SettlementReceiptLine[] = [];
  if (perspective === "receivable" && contributionCents > 0) {
    receiptLines.push({
      id: `contribution:${bill.id}`,
      label: t("settlement.shareReceiptContribution"),
      amount: fromCents(contributionCents),
      tone: "accent"
    });
  }

  receiptLines.push(
    ...balancedItemLines.map((line) => ({
      id: line.id,
      label: line.label,
      amount: fromCents(perspective === "payable" ? line.amountCents : -line.amountCents),
      tone: line.tone ?? "default"
    })),
    ...balancedFeeLines.map((line) => ({
      id: line.id,
      label: line.label,
      amount: fromCents(perspective === "payable" ? line.amountCents : -line.amountCents),
      tone: line.tone ?? "muted"
    }))
  );

  if (perspective === "payable" && contributionCents > 0) {
    receiptLines.push({
      id: `contribution:${bill.id}`,
      label: t("settlement.shareReceiptContribution"),
      amount: fromCents(-contributionCents),
      tone: "accent"
    });
  }

  if (receiptLines.length === 0) {
    return null;
  }

  const totalAmount = fromCents(receiptLines.reduce((sum, line) => sum + toCents(line.amount), 0));
  return {
    id: bill.id,
    storeName: bill.storeName,
    transactionDateUtc: bill.transactionDateUtc,
    lines: receiptLines,
    totalAmount
  };
}

function buildFeeWeights({
  participantItemTotals,
  shareWeights,
  subtotalAmount
}: {
  participantItemTotals: Map<string, number>;
  shareWeights: Map<string, number>;
  subtotalAmount: number;
}) {
  const hasPositiveItemTotal = Array.from(participantItemTotals.values()).some((amountCents) => amountCents > 0);
  if (subtotalAmount > 0 && hasPositiveItemTotal) {
    return new Map(
      Array.from(participantItemTotals.entries())
        .filter(([, amountCents]) => amountCents > 0)
    );
  }

  return new Map(
    Array.from(shareWeights.entries())
      .filter(([, weight]) => weight > 0)
  );
}

function allocateCents(totalAmountCents: number, weightEntries: Array<[string, number]>) {
  const allocations = new Map<string, number>();
  const normalizedWeights = weightEntries.filter(([, weight]) => weight > 0);
  if (totalAmountCents <= 0 || normalizedWeights.length === 0) {
    for (const [id] of normalizedWeights) {
      allocations.set(id, 0);
    }

    return allocations;
  }

  const totalWeight = normalizedWeights.reduce((sum, [, weight]) => sum + weight, 0);
  let allocatedCents = 0;
  const remainders = normalizedWeights.map(([id, weight]) => {
    const exactCents = (totalAmountCents * weight) / totalWeight;
    const floorCents = Math.floor(exactCents);
    allocations.set(id, floorCents);
    allocatedCents += floorCents;

    return { id, remainder: exactCents - floorCents };
  });

  let centsToDistribute = totalAmountCents - allocatedCents;
  for (const remainder of remainders
    .slice()
    .sort((left, right) => right.remainder - left.remainder || left.id.localeCompare(right.id))) {
    if (centsToDistribute <= 0) {
      break;
    }

    allocations.set(remainder.id, (allocations.get(remainder.id) ?? 0) + 1);
    centsToDistribute -= 1;
  }

  return allocations;
}

function rebalanceUnsignedLines(lines: UnsignedReceiptLine[], expectedTotalCents: number, fallbackLabel: string) {
  const balancedLines = lines.map((line) => ({ ...line }));
  let delta = expectedTotalCents - balancedLines.reduce((sum, line) => sum + line.amountCents, 0);

  if (delta > 0) {
    if (balancedLines.length === 0) {
      balancedLines.push({
        id: `adjustment:${fallbackLabel}`,
        label: fallbackLabel,
        amountCents: delta,
        tone: "muted"
      });
    }
    else {
      const lastIndex = balancedLines.length - 1;
      balancedLines[lastIndex] = {
        ...balancedLines[lastIndex],
        amountCents: balancedLines[lastIndex].amountCents + delta
      };
    }
  }

  if (delta < 0) {
    let remainingToRemove = Math.abs(delta);
    for (let index = balancedLines.length - 1; index >= 0 && remainingToRemove > 0; index -= 1) {
      const nextAmount = Math.min(balancedLines[index].amountCents, remainingToRemove);
      balancedLines[index] = {
        ...balancedLines[index],
        amountCents: balancedLines[index].amountCents - nextAmount
      };
      remainingToRemove -= nextAmount;
    }
  }

  return balancedLines.filter((line) => line.amountCents !== 0);
}

function alignReceiptGrandTotal(receipt: SettlementReceiptData, expectedTotalAmount: number, fallbackLabel: string) {
  const expectedTotalCents = toCents(expectedTotalAmount);
  const currentTotalCents = toCents(receipt.grandTotal);
  const delta = expectedTotalCents - currentTotalCents;
  if (delta === 0) {
    return receipt;
  }

  const bills = receipt.bills.map((bill) => ({
    ...bill,
    lines: bill.lines.map((line) => ({ ...line }))
  }));

  if (bills.length === 0) {
    return {
      bills: [],
      grandTotal: fromCents(expectedTotalCents)
    };
  }

  const lastBill = bills[bills.length - 1];
  const lastLine = lastBill.lines[lastBill.lines.length - 1];

  if (lastLine) {
    lastLine.amount = fromCents(toCents(lastLine.amount) + delta);
  }
  else {
    lastBill.lines.push({
      id: `adjustment:${lastBill.id}`,
      label: fallbackLabel,
      amount: fromCents(delta),
      tone: "muted"
    });
  }

  lastBill.totalAmount = fromCents(toCents(lastBill.totalAmount) + delta);

  return {
    bills,
    grandTotal: fromCents(expectedTotalCents)
  };
}

function formatFeeLabel(fee: BillFeeDto, t: (key: any) => string) {
  const prefix = fee.feeType === 2 ? t("settlement.shareReceiptFixedFee") : t("settlement.shareReceiptFee");
  const suffix = fee.feeType === 1 ? ` (${fee.value}%)` : "";
  return fee.name ? `${prefix} · ${fee.name}${suffix}` : `${prefix}${suffix}`;
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function fromCents(amountCents: number) {
  return amountCents / 100;
}
