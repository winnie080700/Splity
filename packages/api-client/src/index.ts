import { request } from "./http";

export type FeeType = 1 | 2;
export type SplitMode = 1 | 2;
export type SettlementTransferStatus = 0 | 1 | 2;

export type GroupDto = {
  id: string;
  name: string;
  createdAtUtc: string;
  createdByUserName?: string | null;
};

export type UpdateGroupRequest = {
  name: string;
};

export type AuthUserDto = {
  id: string;
  name: string;
  email: string;
};

export type AuthResultDto = {
  accessToken: string;
  user: AuthUserDto;
};

export type ParticipantDto = {
  id: string;
  groupId: string;
  name: string;
  createdAtUtc: string;
};

export type UpdateParticipantRequest = {
  name: string;
};

export type BillItemInput = { description: string; amount: number; responsibleParticipantIds: string[] };
export type BillFeeInput = { name: string; feeType: FeeType; value: number };
export type BillParticipantInput = { participantId: string; weight?: number | null };
export type BillContributionInput = { participantId: string; amount: number };

export type CreateBillRequest = {
  storeName: string;
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
  transactionDateUtc: string;
  splitMode: SplitMode;
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

export type CreateSettlementShareRequest = {
  fromDateUtc?: string;
  toDateUtc?: string;
  creatorName?: string;
  paymentInfo?: SettlementSharePaymentInfoDto;
};

export type SettlementShareLinkDto = {
  shareToken: string;
  createdAtUtc: string;
};

export type SettlementSharePublicDto = {
  shareToken: string;
  groupId: string;
  fromDateUtc?: string;
  toDateUtc?: string;
  creatorName?: string;
  paymentInfo?: SettlementSharePaymentInfoDto;
};

export type ParticipantNetBalanceDto = {
  participantId: string;
  participantName: string;
  netAmount: number;
};

export type SettlementResultDto = {
  groupId: string;
  fromDateUtc?: string;
  toDateUtc?: string;
  netBalances: ParticipantNetBalanceDto[];
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

export { ApiError, getApiErrorMessage, type ApiProblemDetails } from "./errors";
export { getApiBaseUrl } from "./config";

export const apiClient = {
  register: (payload: { name: string; email: string; password: string }) => request<AuthResultDto>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  login: (payload: { email: string; password: string }) => request<AuthResultDto>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  createGroup: (name: string) => request<GroupDto>("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name })
  }),
  getGroup: (groupId: string) => request<GroupDto>(`/api/groups/${groupId}`),
  updateGroup: (groupId: string, payload: UpdateGroupRequest) => request<GroupDto>(`/api/groups/${groupId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  }),
  deleteGroup: (groupId: string) => request<void>(`/api/groups/${groupId}`, {
    method: "DELETE"
  }),
  createParticipant: (groupId: string, name: string) => request<ParticipantDto>(`/api/groups/${groupId}/participants`, {
    method: "POST",
    body: JSON.stringify({ name })
  }),
  listParticipants: (groupId: string) => request<ParticipantDto[]>(`/api/groups/${groupId}/participants`),
  updateParticipant: (groupId: string, participantId: string, payload: UpdateParticipantRequest) => request<ParticipantDto>(`/api/groups/${groupId}/participants/${participantId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  }),
  deleteParticipant: (groupId: string, participantId: string) => request<void>(`/api/groups/${groupId}/participants/${participantId}`, {
    method: "DELETE"
  }),
  createBill: (groupId: string, payload: CreateBillRequest) => request<BillDetailDto>(`/api/groups/${groupId}/bills`, {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  listBills: (groupId: string, query?: { store?: string; fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams();
    if (query?.store) params.set("store", query.store);
    if (query?.fromDate) params.set("fromDate", query.fromDate);
    if (query?.toDate) params.set("toDate", query.toDate);
    const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
    return request<BillSummaryDto[]>(`/api/groups/${groupId}/bills${suffix}`);
  },
  getBill: (groupId: string, billId: string) => request<BillDetailDto>(`/api/groups/${groupId}/bills/${billId}`),
  updateBill: (groupId: string, billId: string, payload: CreateBillRequest) => request<BillDetailDto>(`/api/groups/${groupId}/bills/${billId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  }),
  deleteBill: (groupId: string, billId: string) => request<void>(`/api/groups/${groupId}/bills/${billId}`, {
    method: "DELETE"
  }),
  getSettlements: (groupId: string, query?: { fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams();
    if (query?.fromDate) params.set("fromDate", query.fromDate);
    if (query?.toDate) params.set("toDate", query.toDate);
    const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
    return request<SettlementResultDto>(`/api/groups/${groupId}/settlements${suffix}`);
  },
  createSettlementShare: (groupId: string, payload: CreateSettlementShareRequest) =>
    request<SettlementShareLinkDto>(`/api/groups/${groupId}/settlement-shares`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getSettlementShare: (shareToken: string) => request<SettlementSharePublicDto>(`/api/settlement-shares/${shareToken}`),
  markSettlementPaid: (groupId: string, payload: UpdateSettlementTransferStatusRequest) =>
    request<SettlementTransferDto>(`/api/groups/${groupId}/settlements/mark-paid`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  markSettlementReceived: (groupId: string, payload: UpdateSettlementTransferStatusRequest) =>
    request<SettlementTransferDto>(`/api/groups/${groupId}/settlements/mark-received`, {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
