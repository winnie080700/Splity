import { request } from "./http";

export type FeeType = 1 | 2;
export type SplitMode = 1 | 2;

export type GroupDto = {
  id: string;
  name: string;
  createdAtUtc: string;
};

export type ParticipantDto = {
  id: string;
  groupId: string;
  name: string;
  createdAtUtc: string;
};

export type BillItemInput = { description: string; amount: number };
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
  shares: BillShareDto[];
  contributions: BillContributionDto[];
};

export type SettlementTransferDto = {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
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

export { ApiError, getApiErrorMessage, type ApiProblemDetails } from "./errors";
export { getApiBaseUrl } from "./config";

export const apiClient = {
  createGroup: (name: string) => request<GroupDto>("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name })
  }),
  createParticipant: (groupId: string, name: string) => request<ParticipantDto>(`/api/groups/${groupId}/participants`, {
    method: "POST",
    body: JSON.stringify({ name })
  }),
  listParticipants: (groupId: string) => request<ParticipantDto[]>(`/api/groups/${groupId}/participants`),
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
  getSettlements: (groupId: string, query?: { fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams();
    if (query?.fromDate) params.set("fromDate", query.fromDate);
    if (query?.toDate) params.set("toDate", query.toDate);
    const suffix = params.toString().length > 0 ? `?${params.toString()}` : "";
    return request<SettlementResultDto>(`/api/groups/${groupId}/settlements${suffix}`);
  }
};
