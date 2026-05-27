import { BillSummary } from "../calculations/bill-read-projection";
import { SPLIT_MODE } from "../calculations/types";
import { MessageKey } from "../i18n";
import { SettlementResultDto } from "./settlements";

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S"
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(new Date(value))
    .toUpperCase();
}

export function formatTableDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function currencyLabel(currencyCode: string) {
  return currencyCode === "MYR" ? "RM" : currencyCode;
}

export function money(amount: number | string, currencyCode = "MYR") {
  return `${currencyLabel(currencyCode)} ${Number(amount).toFixed(2)}`;
}

export function splitModeLabel(mode: BillSummary["splitMode"]) {
  return (
    mode === SPLIT_MODE.weighted
      ? "groupDetail.splitUneven"
      : "groupDetail.splitEqual"
  ) satisfies MessageKey;
}

export function groupTotal(bills: BillSummary[]) {
  return bills.reduce((sum, bill) => sum + Number(bill.grandTotalAmount), 0);
}

export function groupFees(bills: BillSummary[]) {
  return bills.reduce((sum, bill) => sum + Number(bill.totalFeeAmount), 0);
}

export function pendingTransferCount(settlement: SettlementResultDto | null) {
  return (
    settlement?.transfers.filter((transfer) => transfer.status !== 2).length ??
    0
  );
}
