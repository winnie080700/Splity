export type GroupStatus = 0 | 1 | 2;
export type InvitationStatus = 0 | 1 | 2 | 3;
export type SettlementTransferStatus = 0 | 1 | 2;

export const GROUP_STATUS = {
  unresolved: 0,
  settling: 1,
  settled: 2,
} as const;

export const SETTLEMENT_TRANSFER_STATUS = {
  pending: 0,
  markedPaid: 1,
  received: 2,
} as const;

export function isGroupStatus(value: number): value is GroupStatus {
  return value === 0 || value === 1 || value === 2;
}

export function toGroupStatus(value: FormDataEntryValue | string | number) {
  const status = Number(value);
  if (!isGroupStatus(status)) {
    throw new Error("Unsupported group status.");
  }
  return status;
}
