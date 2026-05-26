import Decimal from "decimal.js";

import { FEE_TYPE, SPLIT_MODE, type CalculatedFee, type SplitMode } from "./types";
import { roundToCurrency } from "./bill-calculator";

export type BillItemRow = {
  id: string;
  bill_id: string;
  description: string;
  amount: number | string;
  bill_item_responsibilities?: { participant_id: string }[] | null;
};

export type BillFeeRow = {
  id: string;
  bill_id: string;
  name: string;
  fee_type: number;
  value: number | string;
};

export type BillShareRow = {
  id: string;
  bill_id: string;
  participant_id: string;
  weight: number | string;
  pre_fee_amount: number | string;
  fee_amount: number | string;
  total_share_amount: number | string;
};

export type PaymentContributionRow = {
  id: string;
  bill_id: string;
  participant_id: string;
  amount: number | string;
  created_at_utc: string;
};

export type BillProjectionRow = {
  id: string;
  group_id: string;
  store_name: string;
  reference_image_data_url: string | null;
  transaction_date_utc: string;
  currency_code: string;
  split_mode: number;
  primary_payer_participant_id: string;
  created_at_utc: string;
  updated_at_utc: string;
  bill_items?: BillItemRow[] | null;
  bill_fees?: BillFeeRow[] | null;
  bill_shares?: BillShareRow[] | null;
  payment_contributions?: PaymentContributionRow[] | null;
};

export type BillParticipant = {
  id: string;
  name: string;
};

export type BillDetail = {
  id: string;
  groupId: string;
  storeName: string;
  referenceImageDataUrl: string | null;
  transactionDateUtc: string;
  currencyCode: string;
  splitMode: SplitMode;
  primaryPayerParticipantId: string;
  subtotalAmount: string;
  totalFeeAmount: string;
  grandTotalAmount: string;
  appliedFees: CalculatedFee[];
  items: {
    id: string;
    description: string;
    amount: string;
    responsibleParticipantIds: string[];
  }[];
  fees: {
    id: string;
    name: string;
    feeType: number;
    value: string;
  }[];
  shares: {
    participantId: string;
    weight: string;
    preFeeAmount: string;
    feeAmount: string;
    totalShareAmount: string;
  }[];
  contributions: {
    participantId: string;
    amount: string;
  }[];
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type BillSummary = Pick<
  BillDetail,
  | "id"
  | "groupId"
  | "storeName"
  | "transactionDateUtc"
  | "currencyCode"
  | "splitMode"
  | "primaryPayerParticipantId"
  | "subtotalAmount"
  | "totalFeeAmount"
  | "grandTotalAmount"
  | "createdAtUtc"
  | "updatedAtUtc"
>;

function decimal(value: Decimal.Value) {
  return new Decimal(value);
}

function moneyString(value: Decimal.Value) {
  return roundToCurrency(value).toFixed(2);
}

function weightString(value: Decimal.Value) {
  return decimal(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
}

function toAppliedFee(subtotal: Decimal, fee: BillFeeRow): CalculatedFee {
  const value = decimal(fee.value);
  const appliedAmount =
    fee.fee_type === FEE_TYPE.percentage
      ? roundToCurrency(subtotal.mul(value.div(100)))
      : fee.fee_type === FEE_TYPE.fixed
        ? roundToCurrency(value)
        : roundToCurrency(0);

  return {
    name: fee.name,
    feeType: fee.fee_type === FEE_TYPE.percentage ? FEE_TYPE.percentage : FEE_TYPE.fixed,
    value: moneyString(value),
    appliedAmount: moneyString(appliedAmount),
  };
}

export function projectBillToDetail(row: BillProjectionRow): BillDetail {
  const items = [...(row.bill_items ?? [])].sort((left, right) => left.description.localeCompare(right.description));
  const fees = row.bill_fees ?? [];
  const shares = row.bill_shares ?? [];
  const contributions = row.payment_contributions ?? [];

  const subtotal = roundToCurrency(items.reduce((sum, item) => sum.plus(item.amount), decimal(0)));
  const appliedFees = fees.map((fee) => toAppliedFee(subtotal, fee));
  const totalFee = roundToCurrency(appliedFees.reduce((sum, fee) => sum.plus(fee.appliedAmount), decimal(0)));
  const grandTotal = roundToCurrency(shares.reduce((sum, share) => sum.plus(share.total_share_amount), decimal(0)));

  return {
    id: row.id,
    groupId: row.group_id,
    storeName: row.store_name,
    referenceImageDataUrl: row.reference_image_data_url,
    transactionDateUtc: row.transaction_date_utc,
    currencyCode: row.currency_code,
    splitMode: row.split_mode === SPLIT_MODE.weighted ? SPLIT_MODE.weighted : SPLIT_MODE.equal,
    primaryPayerParticipantId: row.primary_payer_participant_id,
    subtotalAmount: moneyString(subtotal),
    totalFeeAmount: moneyString(totalFee),
    grandTotalAmount: moneyString(grandTotal),
    appliedFees,
    items: items.map((item) => ({
      id: item.id,
      description: item.description,
      amount: moneyString(item.amount),
      responsibleParticipantIds: (item.bill_item_responsibilities ?? [])
        .map((responsibility) => responsibility.participant_id)
        .sort((left, right) => left.localeCompare(right)),
    })),
    fees: fees.map((fee) => ({
      id: fee.id,
      name: fee.name,
      feeType: fee.fee_type,
      value: moneyString(fee.value),
    })),
    shares: shares
      .map((share) => ({
        participantId: share.participant_id,
        weight: weightString(share.weight),
        preFeeAmount: moneyString(share.pre_fee_amount),
        feeAmount: moneyString(share.fee_amount),
        totalShareAmount: moneyString(share.total_share_amount),
      }))
      .sort((left, right) => left.participantId.localeCompare(right.participantId)),
    contributions: contributions
      .map((contribution) => ({
        participantId: contribution.participant_id,
        amount: moneyString(contribution.amount),
      }))
      .sort((left, right) => left.participantId.localeCompare(right.participantId)),
    createdAtUtc: row.created_at_utc,
    updatedAtUtc: row.updated_at_utc,
  };
}

export function projectBillToSummary(row: BillProjectionRow): BillSummary {
  const detail = projectBillToDetail(row);
  return {
    id: detail.id,
    groupId: detail.groupId,
    storeName: detail.storeName,
    transactionDateUtc: detail.transactionDateUtc,
    currencyCode: detail.currencyCode,
    splitMode: detail.splitMode,
    primaryPayerParticipantId: detail.primaryPayerParticipantId,
    subtotalAmount: detail.subtotalAmount,
    totalFeeAmount: detail.totalFeeAmount,
    grandTotalAmount: detail.grandTotalAmount,
    createdAtUtc: detail.createdAtUtc,
    updatedAtUtc: detail.updatedAtUtc,
  };
}
