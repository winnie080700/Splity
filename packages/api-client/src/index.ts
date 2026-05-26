export type FeeType = 1 | 2;
export type SplitMode = 1 | 2;
export type SettlementTransferStatus = 0 | 1 | 2;

export type GroupDto = {
  id: string;
  name: string;
  createdAtUtc: string;
  status: GroupStatus;
  createdByUserName?: string | null;
  canEdit: boolean;
};

export type GroupStatus = "unresolved" | "settling" | "settled";

export type GroupSummaryDto = {
  id: string;
  name: string;
  createdAtUtc: string;
  status: GroupStatus;
  canEdit: boolean;
};

export type UpdateGroupRequest = {
  name: string;
};

export type UpdateGroupStatusRequest = {
  status: GroupStatus;
};

export type AuthUserDto = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  paymentProfile: AuthPaymentProfileDto;
  isEmailVerified: boolean;
  emailVerifiedAtUtc: string | null;
  emailVerificationPendingUntilUtc: string | null;
};

export type AuthPaymentProfileDto = {
  payeeName: string;
  paymentMethod: string;
  accountName: string;
  accountNumber: string;
  notes: string;
  paymentQrDataUrl: string;
};

export type AuthResultDto = {
  accessToken: string;
  user: AuthUserDto;
};

export type ParticipantDto = {
  id: string;
  groupId: string;
  name: string;
  username?: string | null;
  invitationStatus: ParticipantInvitationStatus;
  createdAtUtc: string;
};

export type ParticipantInvitationStatus = "none" | "pending" | "accepted" | "declined";

export type InvitationDto = {
  participantId: string;
  groupId: string;
  groupName: string;
  participantName: string;
  participantUsername?: string | null;
  invitedByName: string;
  invitedAtUtc: string;
};

export type UpdateParticipantRequest = {
  name: string;
  username?: string | null;
};

export type UserLookupDto = {
  id: string;
  name: string;
  username: string | null;
};

export type BillItemInput = { description: string; amount: number; responsibleParticipantIds: string[] };
export type BillFeeInput = { name: string; feeType: FeeType; value: number };
export type BillParticipantInput = { participantId: string; weight?: number | null };
export type BillContributionInput = { participantId: string; amount: number };

export type CreateBillRequest = {
  storeName: string;
  referenceImageDataUrl?: string | null;
  transactionDateUtc: string;
  splitMode: SplitMode;
  primaryPayerParticipantId: string;
  items: BillItemInput[];
  fees: BillFeeInput[];
  participants: BillParticipantInput[];
  extraContributions: BillContributionInput[];
};

export type BillSummaryDto = {
  id: string;
  groupId: string;
  storeName: string;
  referenceImageDataUrl?: string | null;
  transactionDateUtc: string;
  splitMode: SplitMode;
  primaryPayerParticipantId: string;
  subtotalAmount: number;
  totalFeeAmount: number;
  grandTotalAmount: number;
};

export type BillShareDto = {
  participantId: string;
  participantName: string;
  weight: number;
  preFeeAmount: number;
  feeAmount: number;
  totalShareAmount: number;
};

export type BillItemDto = {
  id: string;
  description: string;
  amount: number;
  responsibleParticipants: Array<{
    participantId: string;
    participantName: string;
  }>;
};

export type BillFeeDto = {
  id: string;
  name: string;
  feeType: FeeType;
  value: number;
  appliedAmount: number;
};

export type BillContributionDto = {
  participantId: string;
  participantName: string;
  amount: number;
};

export type BillDetailDto = {
  id: string;
  groupId: string;
  storeName: string;
  referenceImageDataUrl?: string | null;
  transactionDateUtc: string;
  splitMode: SplitMode;
  primaryPayerParticipantId: string;
  subtotalAmount: number;
  totalFeeAmount: number;
  grandTotalAmount: number;
  items: BillItemDto[];
  fees: BillFeeDto[];
  shares: BillShareDto[];
  contributions: BillContributionDto[];
};

export type SettlementTransferDto = {
  transferKey: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  status: SettlementTransferStatus;
  proofScreenshotDataUrl?: string;
  markedPaidAtUtc?: string;
  markedReceivedAtUtc?: string;
};

export type SettlementSharePaymentInfoDto = {
  payeeName: string;
  paymentMethod: string;
  accountName: string;
  accountNumber: string;
  notes: string;
  paymentQrDataUrl: string;
};

export type SettlementShareReceiverPaymentInfoDto = {
  participantId: string;
  participantName: string;
  paymentInfo: SettlementSharePaymentInfoDto;
};

export type CreateSettlementShareRequest = {
  fromDateUtc?: string;
  toDateUtc?: string;
  creatorName?: string;
  receiverPaymentInfos?: Array<{
    participantId: string;
    paymentInfo?: SettlementSharePaymentInfoDto;
  }>;
  regenerate?: boolean;
};

export type SettlementShareRecordDto = {
  shareToken: string;
  groupId: string;
  fromDateUtc?: string;
  toDateUtc?: string;
  creatorName?: string;
  receiverPaymentInfos: SettlementShareReceiverPaymentInfoDto[];
  createdAtUtc: string;
};

export type SettlementSharePublicDto = {
  shareToken: string;
  groupId: string;
  fromDateUtc?: string;
  toDateUtc?: string;
  creatorName?: string;
  receiverPaymentInfos: SettlementShareReceiverPaymentInfoDto[];
};

export type ParticipantNetBalanceDto = {
  participantId: string;
  participantName: string;
  netAmount: number;
};

export type SettlementResultDto = {
  groupId: string;
  fromDateUtc?: string | null;
  toDateUtc?: string | null;
  netBalances: ParticipantNetBalanceDto[] | null;
  transfers: SettlementTransferDto[];
};

export type UpdateSettlementTransferStatusRequest = {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  fromDateUtc?: string;
  toDateUtc?: string;
  actorParticipantId: string;
  proofScreenshotDataUrl?: string;
};
