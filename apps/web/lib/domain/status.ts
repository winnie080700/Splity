export type GroupStatus = 0 | 1 | 2;
export type InvitationStatus = 0 | 1 | 2 | 3;
export type SettlementTransferStatus = 0 | 1 | 2;

export const GROUP_STATUS = {
  unresolved: 0,
  settling: 1,
  settled: 2,
} as const;

export const GROUP_STATUS_LABELS: Record<GroupStatus, string> = {
  0: "unresolved",
  1: "settling",
  2: "settled",
};

export const GROUP_STATUS_OPTIONS = [
  { label: "Unresolved", value: "0" },
  { label: "Settling", value: "1" },
  { label: "Settled", value: "2" },
];

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  0: "none",
  1: "pending",
  2: "accepted",
  3: "declined",
};

export const SETTLEMENT_TRANSFER_STATUS = {
  pending: 0,
  markedPaid: 1,
  received: 2,
} as const;

export const SETTLEMENT_TRANSFER_STATUS_LABELS: Record<SettlementTransferStatus, string> = {
  0: "Pending",
  1: "Marked paid",
  2: "Received",
};

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
