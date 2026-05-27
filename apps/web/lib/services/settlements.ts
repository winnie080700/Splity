import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  buildSnapshotFromRows,
  buildTransferKey,
  getTransferFromSnapshot,
  type SettlementBillRow,
  type SettlementDateWindow,
  type SettlementParticipantRow,
} from "@/lib/calculations/settlement-snapshot";
import { roundToCurrency } from "@/lib/calculations/settlement-calculator";
import {
  GROUP_STATUS,
  SETTLEMENT_TRANSFER_STATUS,
  type SettlementTransferStatus,
} from "@/lib/domain/status";
import { getGroup } from "@/lib/services/groups";
import { listParticipants, type Participant } from "@/lib/services/participants";

export type SettlementTransferDto = {
  transferKey: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: string;
  status: SettlementTransferStatus;
  proofScreenshotDataUrl: string | null;
  markedPaidAtUtc: string | null;
  markedReceivedAtUtc: string | null;
};

type ParticipantNetBalanceDto = {
  participantId: string;
  participantName: string;
  netAmount: string;
};

export type SettlementResultDto = {
  groupId: string;
  fromDateUtc: string | null;
  toDateUtc: string | null;
  netBalances: ParticipantNetBalanceDto[];
  transfers: SettlementTransferDto[];
  participants: Participant[];
  canManage: boolean;
  groupStatus: number;
};

export type SettlementActionInput = {
  fromParticipantId: string;
  toParticipantId: string;
  amount: string;
  fromDateUtc?: string | null;
  toDateUtc?: string | null;
  actorParticipantId: string;
  proofScreenshotDataUrl?: string | null;
};

type ConfirmationRow = {
  transfer_key: string;
  status: number;
  proof_screenshot_data_url: string | null;
  marked_paid_at_utc: string | null;
  marked_received_at_utc: string | null;
};

const billSelect = `
  id,
  transaction_date_utc,
  bill_shares (
    participant_id,
    total_share_amount
  ),
  payment_contributions (
    participant_id,
    amount
  )
`;

class SettlementGroupLockedError extends Error {
  constructor() {
    super("This group does not accept settlement actions in its current status.");
    this.name = "SettlementGroupLockedError";
  }
}

class SettlementPermissionError extends Error {
  constructor() {
    super("Only the group creator can update settlements.");
    this.name = "SettlementPermissionError";
  }
}

async function listSettlementRows(groupId: string, window: SettlementDateWindow) {
  const supabase = await createClient();
  let query = supabase.from("bills").select(billSelect).eq("group_id", groupId);

  if (window.fromDateUtc) query = query.gte("transaction_date_utc", window.fromDateUtc);
  if (window.toDateUtc) query = query.lte("transaction_date_utc", window.toDateUtc);

  const { data, error } = await query.order("transaction_date_utc", { ascending: false });
  if (error) throw error;

  return data as unknown as SettlementBillRow[];
}

async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("You must be signed in.");
  return user.id;
}

function normalizeDate(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? new Date(trimmed).toISOString() : null;
}

function statusFromDb(value: number): SettlementTransferStatus {
  return value === SETTLEMENT_TRANSFER_STATUS.markedPaid || value === SETTLEMENT_TRANSFER_STATUS.received
    ? value
    : SETTLEMENT_TRANSFER_STATUS.pending;
}

function normalizeProofScreenshot(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(trimmed)) {
    throw new Error("Proof screenshot must be a PNG, JPEG, or WebP data URL.");
  }

  if (trimmed.length > 5 * 1024 * 1024 * 1.4) {
    throw new Error("Proof screenshot must be smaller than 5MB.");
  }

  return trimmed;
}

function toTransferDto(
  transferKey: string,
  transfer: { fromParticipantId: string; toParticipantId: string; amount: string },
  confirmation?: ConfirmationRow
): SettlementTransferDto {
  return {
    transferKey,
    fromParticipantId: transfer.fromParticipantId,
    toParticipantId: transfer.toParticipantId,
    amount: roundToCurrency(transfer.amount).toFixed(2),
    status: confirmation ? statusFromDb(confirmation.status) : SETTLEMENT_TRANSFER_STATUS.pending,
    proofScreenshotDataUrl: confirmation?.proof_screenshot_data_url ?? null,
    markedPaidAtUtc: confirmation?.marked_paid_at_utc ?? null,
    markedReceivedAtUtc: confirmation?.marked_received_at_utc ?? null,
  };
}

export async function getSettlement(
  groupId: string,
  fromDateUtc?: string | null,
  toDateUtc?: string | null
): Promise<SettlementResultDto> {
  const window = {
    fromDateUtc: normalizeDate(fromDateUtc),
    toDateUtc: normalizeDate(toDateUtc),
  };
  const [group, currentUserId, participants, bills] = await Promise.all([
    getGroup(groupId),
    getCurrentUserId(),
    listParticipants(groupId),
    listSettlementRows(groupId, window),
  ]);

  if (!group) throw new Error("Group not found.");

  const snapshot = buildSnapshotFromRows(participants as SettlementParticipantRow[], bills, window);
  const participantLookup = new Map(participants.map((participant) => [participant.id, participant.name]));
  const transferKeys = snapshot.transfers.map((transfer) => buildTransferKey(groupId, window.fromDateUtc, window.toDateUtc, transfer));
  const confirmations = await listConfirmations(groupId, transferKeys);
  const confirmationByKey = new Map(confirmations.map((confirmation) => [confirmation.transfer_key, confirmation]));

  return {
    groupId,
    fromDateUtc: window.fromDateUtc,
    toDateUtc: window.toDateUtc,
    netBalances: snapshot.netBalances
      .map((balance) => ({
        participantId: balance.participantId,
        participantName: participantLookup.get(balance.participantId) ?? "Unknown",
        netAmount: roundToCurrency(balance.netAmount).toFixed(2),
      }))
      .sort((left, right) => {
        const amountCompare = Number(right.netAmount) - Number(left.netAmount);
        return amountCompare === 0 ? left.participantName.localeCompare(right.participantName) : amountCompare;
      }),
    transfers: snapshot.transfers.map((transfer) => {
      const transferKey = buildTransferKey(groupId, window.fromDateUtc, window.toDateUtc, transfer);
      return toTransferDto(transferKey, transfer, confirmationByKey.get(transferKey));
    }),
    participants,
    canManage: group.created_by_user_id === currentUserId,
    groupStatus: group.status,
  };
}

async function listConfirmations(groupId: string, transferKeys: string[]) {
  if (transferKeys.length === 0) return [] as ConfirmationRow[];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settlement_transfer_confirmations")
    .select("transfer_key, status, proof_screenshot_data_url, marked_paid_at_utc, marked_received_at_utc")
    .eq("group_id", groupId)
    .in("transfer_key", transferKeys);

  if (error) throw error;
  return data as ConfirmationRow[];
}

async function recordSettlementAction(
  action: "mark_paid" | "mark_received",
  groupId: string,
  input: SettlementActionInput
) {
  const group = await getGroup(groupId);
  if (!group) throw new Error("Group not found.");
  if (group.status !== GROUP_STATUS.settling) throw new SettlementGroupLockedError();

  const currentUserId = await getCurrentUserId();
  if (group.created_by_user_id !== currentUserId) throw new SettlementPermissionError();

  const window = {
    fromDateUtc: normalizeDate(input.fromDateUtc),
    toDateUtc: normalizeDate(input.toDateUtc),
  };
  const [participants, bills] = await Promise.all([listParticipants(groupId), listSettlementRows(groupId, window)]);
  const snapshot = buildSnapshotFromRows(participants as SettlementParticipantRow[], bills, window);
  const transfer = getTransferFromSnapshot(snapshot, input);
  const transferKey = buildTransferKey(groupId, window.fromDateUtc, window.toDateUtc, transfer);
  const proofScreenshotDataUrl = normalizeProofScreenshot(input.proofScreenshotDataUrl);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_settlement_action", {
    p_action: action,
    p_group_id: groupId,
    p_from_participant_id: transfer.fromParticipantId,
    p_to_participant_id: transfer.toParticipantId,
    p_amount: Number(roundToCurrency(transfer.amount).toFixed(2)),
    p_from_date_utc: window.fromDateUtc,
    p_to_date_utc: window.toDateUtc,
    p_actor_participant_id: input.actorParticipantId,
    p_transfer_key: transferKey,
    p_proof_screenshot_data_url: proofScreenshotDataUrl,
  });

  if (error) throw error;
  return data as Json;
}

export async function markSettlementPaid(groupId: string, input: SettlementActionInput) {
  return recordSettlementAction("mark_paid", groupId, input);
}

export async function markSettlementReceived(groupId: string, input: SettlementActionInput) {
  return recordSettlementAction("mark_received", groupId, input);
}
