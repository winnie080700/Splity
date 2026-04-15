import {
  type ApiClient,
  type BillContributionDto,
  type BillDetailDto,
  type BillFeeDto,
  type BillItemDto,
  type BillShareDto,
  type BillSummaryDto,
  type CreateBillRequest,
  type CreateSettlementShareRequest,
  type GroupDto,
  type GroupStatus,
  type GroupSummaryDto,
  type ParticipantDto,
  type ParticipantNetBalanceDto,
  type SettlementResultDto,
  type SettlementSharePublicDto,
  type SettlementShareRecordDto,
  type SettlementTransferDto,
  type SettlementTransferStatus,
  type UpdateGroupRequest,
  type UpdateGroupStatusRequest,
  type UpdateParticipantRequest,
  type UpdateSettlementTransferStatusRequest
} from "@api-client";

type GuestBillRecord = {
  id: string;
  groupId: string;
  payload: CreateBillRequest;
};

type GuestState = {
  groups: GroupDto[];
  participantsByGroup: Record<string, ParticipantDto[]>;
  billsByGroup: Record<string, GuestBillRecord[]>;
  transferStatusByScope: Record<string, SettlementTransferStatus>;
  groupSequence: number;
  participantSequence: number;
  billSequence: number;
};

const GUEST_USER_NAME = "Guest";

let guestState = createEmptyGuestState();

function createEmptyGuestState(): GuestState {
  return {
    groups: [],
    participantsByGroup: {},
    billsByGroup: {},
    transferStatusByScope: {},
    groupSequence: 1,
    participantSequence: 1,
    billSequence: 1
  };
}

function resetGuestState() {
  guestState = createEmptyGuestState();
}

function nextGuestId(kind: "group" | "participant" | "bill") {
  if (kind === "group") {
    return `guest-group-${guestState.groupSequence++}`;
  }

  if (kind === "participant") {
    return `guest-participant-${guestState.participantSequence++}`;
  }

  return `guest-bill-${guestState.billSequence++}`;
}

function ensureGroup(groupId: string) {
  const group = guestState.groups.find((entry) => entry.id === groupId);
  if (!group) {
    throw new Error("Guest group not found.");
  }

  return group;
}

function ensureParticipant(groupId: string, participantId: string) {
  const participant = (guestState.participantsByGroup[groupId] ?? []).find((entry) => entry.id === participantId);
  if (!participant) {
    throw new Error("Guest participant not found.");
  }

  return participant;
}

function ensureBillRecord(groupId: string, billId: string) {
  const bill = (guestState.billsByGroup[groupId] ?? []).find((entry) => entry.id === billId);
  if (!bill) {
    throw new Error("Guest bill not found.");
  }

  return bill;
}

function cloneGroupSummary(group: GroupDto): GroupSummaryDto {
  return {
    id: group.id,
    name: group.name,
    createdAtUtc: group.createdAtUtc,
    status: group.status,
    canEdit: group.canEdit
  };
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function fromCents(amount: number) {
  return amount / 100;
}

function allocateByWeights(totalCents: number, participantIds: string[], weightMap: Record<string, number>) {
  const ids = participantIds.filter(Boolean);
  if (ids.length === 0 || totalCents === 0) {
    return Object.fromEntries(ids.map((id) => [id, 0])) as Record<string, number>;
  }

  const weights = ids.map((id) => ({ id, weight: Math.max(0.0001, weightMap[id] ?? 1) }));
  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let allocated = 0;
  const base = weights.map((entry) => {
    const raw = (totalCents * entry.weight) / totalWeight;
    const amount = Math.floor(raw);
    allocated += amount;
    return { ...entry, amount, remainder: raw - amount };
  });

  let remainder = totalCents - allocated;
  base
    .slice()
    .sort((left, right) => right.remainder - left.remainder || left.id.localeCompare(right.id))
    .forEach((entry) => {
      if (remainder <= 0) {
        return;
      }

      const target = base.find((item) => item.id === entry.id);
      if (target) {
        target.amount += 1;
        remainder -= 1;
      }
    });

  return Object.fromEntries(base.map((entry) => [entry.id, entry.amount])) as Record<string, number>;
}

function mapParticipantNames(groupId: string) {
  return Object.fromEntries((guestState.participantsByGroup[groupId] ?? []).map((participant) => [participant.id, participant.name]));
}

function computeBillDetail(groupId: string, record: GuestBillRecord): BillDetailDto {
  const participantNameById = mapParticipantNames(groupId);
  const participantWeights = Object.fromEntries(
    record.payload.participants.map((participant) => [participant.participantId, Math.max(0.0001, participant.weight ?? 1)])
  );

  const preFeeByParticipant: Record<string, number> = {};
  const itemDtos: BillItemDto[] = record.payload.items.map((item, index) => {
    const itemId = `${record.id}-item-${index + 1}`;
    const amountCents = toCents(item.amount);
    const responsibleIds = item.responsibleParticipantIds;
    const allocation = allocateByWeights(
      amountCents,
      responsibleIds,
      record.payload.splitMode === 2 ? participantWeights : Object.fromEntries(responsibleIds.map((id) => [id, 1]))
    );

    Object.entries(allocation).forEach(([participantId, cents]) => {
      preFeeByParticipant[participantId] = (preFeeByParticipant[participantId] ?? 0) + cents;
    });

    return {
      id: itemId,
      description: item.description,
      amount: item.amount,
      responsibleParticipants: responsibleIds.map((participantId) => ({
        participantId,
        participantName: participantNameById[participantId] ?? "Unknown participant"
      }))
    };
  });

  const subtotalCents = record.payload.items.reduce((sum, item) => sum + toCents(item.amount), 0);
  const shareParticipantIds = record.payload.participants.map((participant) => participant.participantId);
  const feeDtos: BillFeeDto[] = [];
  const feeByParticipant: Record<string, number> = {};

  record.payload.fees.forEach((fee, index) => {
    const appliedAmountCents = fee.feeType === 1
      ? Math.round((subtotalCents * fee.value) / 100)
      : toCents(fee.value);
    const allocation = allocateByWeights(
      appliedAmountCents,
      shareParticipantIds,
      record.payload.splitMode === 2 ? participantWeights : Object.fromEntries(shareParticipantIds.map((id) => [id, 1]))
    );

    Object.entries(allocation).forEach(([participantId, cents]) => {
      feeByParticipant[participantId] = (feeByParticipant[participantId] ?? 0) + cents;
    });

    feeDtos.push({
      id: `${record.id}-fee-${index + 1}`,
      name: fee.name,
      feeType: fee.feeType,
      value: fee.value,
      appliedAmount: fromCents(appliedAmountCents)
    });
  });

  const totalFeeCents = feeDtos.reduce((sum, fee) => sum + toCents(fee.appliedAmount), 0);
  const contributionByParticipant: Record<string, number> = {};
  contributionByParticipant[record.payload.primaryPayerParticipantId] = subtotalCents + totalFeeCents;

  record.payload.extraContributions.forEach((entry) => {
    contributionByParticipant[entry.participantId] = (contributionByParticipant[entry.participantId] ?? 0) + toCents(entry.amount);
  });

  const shares: BillShareDto[] = record.payload.participants.map((participant) => {
    const preFeeAmount = fromCents(preFeeByParticipant[participant.participantId] ?? 0);
    const feeAmount = fromCents(feeByParticipant[participant.participantId] ?? 0);
    return {
      participantId: participant.participantId,
      participantName: participantNameById[participant.participantId] ?? "Unknown participant",
      weight: participant.weight ?? 1,
      preFeeAmount,
      feeAmount,
      totalShareAmount: fromCents((preFeeByParticipant[participant.participantId] ?? 0) + (feeByParticipant[participant.participantId] ?? 0))
    };
  });

  const contributions: BillContributionDto[] = Object.entries(contributionByParticipant)
    .filter(([, cents]) => cents !== 0)
    .map(([participantId, cents]) => ({
      participantId,
      participantName: participantNameById[participantId] ?? "Unknown participant",
      amount: fromCents(cents)
    }));

  return {
    id: record.id,
    groupId,
    storeName: record.payload.storeName,
    referenceImageDataUrl: record.payload.referenceImageDataUrl ?? null,
    transactionDateUtc: record.payload.transactionDateUtc,
    splitMode: record.payload.splitMode,
    primaryPayerParticipantId: record.payload.primaryPayerParticipantId,
    subtotalAmount: fromCents(subtotalCents),
    totalFeeAmount: fromCents(totalFeeCents),
    grandTotalAmount: fromCents(subtotalCents + totalFeeCents),
    items: itemDtos,
    fees: feeDtos,
    shares,
    contributions
  };
}

function toBillSummary(detail: BillDetailDto): BillSummaryDto {
  return {
    id: detail.id,
    groupId: detail.groupId,
    storeName: detail.storeName,
    referenceImageDataUrl: detail.referenceImageDataUrl ?? null,
    transactionDateUtc: detail.transactionDateUtc,
    splitMode: detail.splitMode,
    primaryPayerParticipantId: detail.primaryPayerParticipantId,
    subtotalAmount: detail.subtotalAmount,
    totalFeeAmount: detail.totalFeeAmount,
    grandTotalAmount: detail.grandTotalAmount
  };
}

function normalizeScope(value?: string) {
  return value ?? "";
}

function buildTransferStatusScopeKey(groupId: string, fromDateUtc?: string, toDateUtc?: string) {
  return `${groupId}|${normalizeScope(fromDateUtc)}|${normalizeScope(toDateUtc)}`;
}

function buildTransferStatusKey(
  groupId: string,
  fromParticipantId: string,
  toParticipantId: string,
  amount: number,
  fromDateUtc?: string,
  toDateUtc?: string
) {
  return `${buildTransferStatusScopeKey(groupId, fromDateUtc, toDateUtc)}|${fromParticipantId}|${toParticipantId}|${amount.toFixed(2)}`;
}

function isWithinRange(value: string, fromDate?: string, toDate?: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return false;
  }

  if (fromDate && time < new Date(fromDate).getTime()) {
    return false;
  }

  if (toDate && time > new Date(toDate).getTime()) {
    return false;
  }

  return true;
}

function computeSettlementResult(groupId: string, query?: { fromDate?: string; toDate?: string }): SettlementResultDto {
  const bills = (guestState.billsByGroup[groupId] ?? [])
    .map((record) => computeBillDetail(groupId, record))
    .filter((bill) => isWithinRange(bill.transactionDateUtc, query?.fromDate, query?.toDate));

  const participantNameById = mapParticipantNames(groupId);
  const netByParticipant: Record<string, number> = {};

  (guestState.participantsByGroup[groupId] ?? []).forEach((participant) => {
    netByParticipant[participant.id] = 0;
  });

  bills.forEach((bill) => {
    bill.shares.forEach((share) => {
      netByParticipant[share.participantId] = (netByParticipant[share.participantId] ?? 0) - share.totalShareAmount;
    });

    bill.contributions.forEach((contribution) => {
      netByParticipant[contribution.participantId] = (netByParticipant[contribution.participantId] ?? 0) + contribution.amount;
    });
  });

  const netBalances: ParticipantNetBalanceDto[] = Object.entries(netByParticipant).map(([participantId, netAmount]) => ({
    participantId,
    participantName: participantNameById[participantId] ?? "Unknown participant",
    netAmount: Math.abs(netAmount) < 0.005 ? 0 : Number(netAmount.toFixed(2))
  }));

  const creditors = netBalances
    .filter((entry) => entry.netAmount > 0.004)
    .map((entry) => ({ ...entry, remainingCents: toCents(entry.netAmount) }))
    .sort((left, right) => right.remainingCents - left.remainingCents || left.participantName.localeCompare(right.participantName));

  const debtors = netBalances
    .filter((entry) => entry.netAmount < -0.004)
    .map((entry) => ({ ...entry, remainingCents: toCents(Math.abs(entry.netAmount)) }))
    .sort((left, right) => right.remainingCents - left.remainingCents || left.participantName.localeCompare(right.participantName));

  const transfers: SettlementTransferDto[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const transferCents = Math.min(debtor.remainingCents, creditor.remainingCents);

    if (transferCents <= 0) {
      break;
    }

    const amount = fromCents(transferCents);
    const transferStatusKey = buildTransferStatusKey(
      groupId,
      debtor.participantId,
      creditor.participantId,
      amount,
      query?.fromDate,
      query?.toDate
    );

    transfers.push({
      transferKey: transferStatusKey,
      fromParticipantId: debtor.participantId,
      toParticipantId: creditor.participantId,
      amount,
      status: guestState.transferStatusByScope[transferStatusKey] ?? 0
    });

    debtor.remainingCents -= transferCents;
    creditor.remainingCents -= transferCents;

    if (debtor.remainingCents === 0) {
      debtorIndex += 1;
    }

    if (creditor.remainingCents === 0) {
      creditorIndex += 1;
    }
  }

  return {
    groupId,
    fromDateUtc: query?.fromDate,
    toDateUtc: query?.toDate,
    netBalances,
    transfers
  };
}

function sortGroupsNewestFirst(groups: GroupDto[]) {
  return groups.slice().sort((left, right) => new Date(right.createdAtUtc).getTime() - new Date(left.createdAtUtc).getTime());
}

function sortBillsNewestFirst(bills: BillSummaryDto[]) {
  return bills.slice().sort((left, right) => new Date(right.transactionDateUtc).getTime() - new Date(left.transactionDateUtc).getTime());
}

function createGuestGroup(name: string) {
  const createdAtUtc = new Date().toISOString();
  const group: GroupDto = {
    id: nextGuestId("group"),
    name,
    createdAtUtc,
    status: "unresolved",
    createdByUserName: GUEST_USER_NAME,
    canEdit: true
  };

  guestState.groups = [group, ...guestState.groups];
  guestState.participantsByGroup[group.id] = [];
  guestState.billsByGroup[group.id] = [];
  return group;
}

export function initializeGuestWorkspace(defaultGroupName: string) {
  resetGuestState();
  return createGuestGroup(defaultGroupName);
}

export function clearGuestWorkspace() {
  resetGuestState();
}

function listGroupBills(groupId: string) {
  return (guestState.billsByGroup[groupId] ?? []).map((record) => computeBillDetail(groupId, record));
}

function rejectGuestShareLinks() {
  throw new Error("Guest mode does not support share links.");
}

export const guestApiClientOverride: Partial<ApiClient> = {
  createGroup: async (name: string) => createGuestGroup(name.trim()),
  listGroups: async () => sortGroupsNewestFirst(guestState.groups).map(cloneGroupSummary),
  getGroup: async (groupId: string) => ({ ...ensureGroup(groupId) }),
  updateGroup: async (groupId: string, payload: UpdateGroupRequest) => {
    const group = ensureGroup(groupId);
    group.name = payload.name.trim();
    return { ...group };
  },
  updateGroupStatus: async (groupId: string, payload: UpdateGroupStatusRequest) => {
    const group = ensureGroup(groupId);
    group.status = payload.status;
    return { ...group };
  },
  deleteGroup: async (groupId: string) => {
    ensureGroup(groupId);
    guestState.groups = guestState.groups.filter((group) => group.id !== groupId);
    delete guestState.participantsByGroup[groupId];
    delete guestState.billsByGroup[groupId];
    Object.keys(guestState.transferStatusByScope).forEach((key) => {
      if (key.startsWith(`${groupId}|`)) {
        delete guestState.transferStatusByScope[key];
      }
    });
  },
  searchUserByUsername: async () => null,
  createParticipant: async (groupId: string, name: string, username?: string | null) => {
    ensureGroup(groupId);
    const participant: ParticipantDto = {
      id: nextGuestId("participant"),
      groupId,
      name: name.trim(),
      username: username?.trim().replace(/^@+/, "") || null,
      invitationStatus: "none",
      createdAtUtc: new Date().toISOString()
    };
    guestState.participantsByGroup[groupId] = [...(guestState.participantsByGroup[groupId] ?? []), participant];
    return participant;
  },
  listParticipants: async (groupId: string) => [...(guestState.participantsByGroup[groupId] ?? [])],
  updateParticipant: async (groupId: string, participantId: string, payload: UpdateParticipantRequest) => {
    ensureGroup(groupId);
    ensureParticipant(groupId, participantId);
    guestState.participantsByGroup[groupId] = (guestState.participantsByGroup[groupId] ?? []).map((participant) => (
      participant.id === participantId
        ? { ...participant, name: payload.name.trim(), username: payload.username?.trim().replace(/^@+/, "") || null }
        : participant
    ));
    return ensureParticipant(groupId, participantId);
  },
  deleteParticipant: async (groupId: string, participantId: string) => {
    ensureGroup(groupId);
    ensureParticipant(groupId, participantId);
    const hasReferencedBills = (guestState.billsByGroup[groupId] ?? []).some((bill) => (
      bill.payload.primaryPayerParticipantId === participantId ||
      bill.payload.participants.some((participant) => participant.participantId === participantId) ||
      bill.payload.items.some((item) => item.responsibleParticipantIds.includes(participantId))
    ));

    if (hasReferencedBills) {
      throw new Error("This participant is already used in a saved bill and cannot be removed in guest mode.");
    }

    guestState.participantsByGroup[groupId] = (guestState.participantsByGroup[groupId] ?? []).filter((participant) => participant.id !== participantId);
  },
  createBill: async (groupId: string, payload: CreateBillRequest) => {
    ensureGroup(groupId);
    const record: GuestBillRecord = {
      id: nextGuestId("bill"),
      groupId,
      payload: structuredClone(payload)
    };
    guestState.billsByGroup[groupId] = [record, ...(guestState.billsByGroup[groupId] ?? [])];
    return computeBillDetail(groupId, record);
  },
  listBills: async (groupId: string, query?: { store?: string; fromDate?: string; toDate?: string }) => {
    const bills = listGroupBills(groupId)
      .filter((bill) => !query?.store || bill.storeName.toLowerCase().includes(query.store.toLowerCase()))
      .filter((bill) => isWithinRange(bill.transactionDateUtc, query?.fromDate, query?.toDate))
      .map(toBillSummary);
    return sortBillsNewestFirst(bills);
  },
  getBill: async (groupId: string, billId: string) => computeBillDetail(groupId, ensureBillRecord(groupId, billId)),
  updateBill: async (groupId: string, billId: string, payload: CreateBillRequest) => {
    ensureGroup(groupId);
    ensureBillRecord(groupId, billId);
    guestState.billsByGroup[groupId] = (guestState.billsByGroup[groupId] ?? []).map((record) => (
      record.id === billId
        ? { ...record, payload: structuredClone(payload) }
        : record
    ));
    return computeBillDetail(groupId, ensureBillRecord(groupId, billId));
  },
  deleteBill: async (groupId: string, billId: string) => {
    ensureGroup(groupId);
    ensureBillRecord(groupId, billId);
    guestState.billsByGroup[groupId] = (guestState.billsByGroup[groupId] ?? []).filter((record) => record.id !== billId);
  },
  getSettlements: async (groupId: string, query?: { fromDate?: string; toDate?: string }) => computeSettlementResult(groupId, query),
  getCurrentSettlementShare: async () => null,
  createSettlementShare: async (_groupId: string, _payload: CreateSettlementShareRequest) => rejectGuestShareLinks() as never,
  getSettlementShare: async (_shareToken: string) => rejectGuestShareLinks() as never as SettlementSharePublicDto,
  markSettlementPaid: async (groupId: string, payload: UpdateSettlementTransferStatusRequest) => {
    const key = buildTransferStatusKey(
      groupId,
      payload.fromParticipantId,
      payload.toParticipantId,
      payload.amount,
      payload.fromDateUtc,
      payload.toDateUtc
    );
    guestState.transferStatusByScope[key] = 1;
    return {
      transferKey: key,
      fromParticipantId: payload.fromParticipantId,
      toParticipantId: payload.toParticipantId,
      amount: payload.amount,
      status: 1
    };
  },
  markSettlementReceived: async (groupId: string, payload: UpdateSettlementTransferStatusRequest) => {
    const key = buildTransferStatusKey(
      groupId,
      payload.fromParticipantId,
      payload.toParticipantId,
      payload.amount,
      payload.fromDateUtc,
      payload.toDateUtc
    );
    guestState.transferStatusByScope[key] = 2;
    return {
      transferKey: key,
      fromParticipantId: payload.fromParticipantId,
      toParticipantId: payload.toParticipantId,
      amount: payload.amount,
      status: 2
    };
  }
};
