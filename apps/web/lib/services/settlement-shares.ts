import type { Database, Json } from "@/lib/supabase/database.types";
import {
  buildSnapshotFromRows,
  buildTransferKey,
  type SettlementBillRow,
  type SettlementDateWindow,
  type SettlementParticipantRow,
} from "@/lib/calculations/settlement-snapshot";
import { projectBillToDetail, type BillProjectionRow } from "@/lib/calculations/bill-read-projection";
import { GROUP_STATUS } from "@/lib/domain/status";
import { areAllStatusesReceived } from "@/lib/domain/settlement-notifications";
import { billSelect } from "@/lib/services/bills";
import { createAnonServerClient } from "@/lib/supabase/anon";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getGroup } from "@/lib/services/groups";

export type SettlementSharePayload = {
  fromDateUtc?: string | null;
  toDateUtc?: string | null;
  creatorName?: string | null;
  payeeName?: string | null;
  paymentMethod?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  notes?: string | null;
  paymentQrDataUrl?: string | null;
  receiverPaymentInfosJson?: string | null;
};

export type ActiveSettlementShare = {
  id: string;
  groupId: string;
  shareToken: string;
  fromDateUtc: string | null;
  toDateUtc: string | null;
  creatorName: string | null;
  payeeName: string | null;
  paymentMethod: string | null;
  accountName: string | null;
  accountNumber: string | null;
  notes: string | null;
  paymentQrDataUrl: string | null;
  receiverPaymentInfosJson: string | null;
  createdAtUtc: string;
};

type PublicShareTransfer = {
  amount: string;
  from_name: string;
  from_participant_id: string;
  marked_paid_at_utc: string | null;
  marked_received_at_utc: string | null;
  proof_screenshot_data_url: string | null;
  status: number;
  to_name: string;
  to_participant_id: string;
  transfer_key: string;
};

type PublicShareParticipant = {
  id: string;
  name: string;
};

type PublicShareBill = {
  currency_code: string;
  grand_total_amount: string;
  id: string;
  items: {
    amount: string;
    description: string;
    id: string;
    responsible_participant_ids: string[];
    responsible_participant_names: string[];
  }[];
  payer_name: string;
  primary_payer_participant_id: string;
  shares: {
    participant_id: string;
    participant_name: string;
    total_share_amount: string;
  }[];
  store_name: string;
  transaction_date_utc: string;
};

export type PublicSettlementShare = {
  share_token: string;
  group_name: string | null;
  from_date_utc: string | null;
  to_date_utc: string | null;
  creator_name: string | null;
  payee_name: string | null;
  payment_method: string | null;
  account_name: string | null;
  account_number: string | null;
  notes: string | null;
  payment_qr_data_url: string | null;
  receiver_payment_infos_json: string | null;
  created_at_utc: string;
  bills: PublicShareBill[];
  participants: PublicShareParticipant[];
  transfers: PublicShareTransfer[];
};

type ActiveShareRow = {
  id: string;
  group_id: string;
  share_token: string;
  from_date_utc: string | null;
  to_date_utc: string | null;
  creator_name: string | null;
  payee_name: string | null;
  payment_method: string | null;
  account_name: string | null;
  account_number: string | null;
  notes: string | null;
  payment_qr_data_url: string | null;
  receiver_payment_infos_json: string | null;
  created_at_utc: string;
};

type ActiveShareWithGroupRow = ActiveShareRow & {
  group_id: string;
};

type ConfirmationRow = Database["public"]["Tables"]["settlement_transfer_confirmations"]["Row"];

type SettlementShareInsert = Database["public"]["Tables"]["settlement_share_links"]["Insert"];
type SettlementShareFields = Pick<
  SettlementShareInsert,
  | "account_name"
  | "account_number"
  | "creator_name"
  | "from_date_utc"
  | "notes"
  | "payee_name"
  | "payment_method"
  | "payment_qr_data_url"
  | "receiver_payment_infos_json"
  | "to_date_utc"
>;

function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeDataUrl(value: string | null | undefined) {
  const trimmed = nullableText(value);
  if (!trimmed) return null;

  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(trimmed)) {
    throw new Error("Payment QR must be a PNG, JPEG, or WebP data URL.");
  }

  if (trimmed.length > 5 * 1024 * 1024 * 1.4) {
    throw new Error("Payment QR must be smaller than 5MB.");
  }

  return trimmed;
}

function toStoragePayload(input: SettlementSharePayload): SettlementShareFields {
  return {
    from_date_utc: nullableText(input.fromDateUtc),
    to_date_utc: nullableText(input.toDateUtc),
    creator_name: nullableText(input.creatorName),
    payee_name: nullableText(input.payeeName),
    payment_method: nullableText(input.paymentMethod),
    account_name: nullableText(input.accountName),
    account_number: nullableText(input.accountNumber),
    notes: nullableText(input.notes),
    payment_qr_data_url: normalizeDataUrl(input.paymentQrDataUrl),
    receiver_payment_infos_json: nullableText(input.receiverPaymentInfosJson),
  };
}

function toRpcPayload(input: SettlementSharePayload): Json {
  return toStoragePayload(input);
}

function isMissingRpcError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "PGRST202"
  );
}

function createShareToken() {
  return crypto.randomUUID().replaceAll("-", "");
}

function toActiveShare(row: ActiveShareRow): ActiveSettlementShare {
  return {
    id: row.id,
    groupId: row.group_id,
    shareToken: row.share_token,
    fromDateUtc: row.from_date_utc,
    toDateUtc: row.to_date_utc,
    creatorName: row.creator_name,
    payeeName: row.payee_name,
    paymentMethod: row.payment_method,
    accountName: row.account_name,
    accountNumber: row.account_number,
    notes: row.notes,
    paymentQrDataUrl: row.payment_qr_data_url,
    receiverPaymentInfosJson: row.receiver_payment_infos_json,
    createdAtUtc: row.created_at_utc,
  };
}

export async function getActiveShare(groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settlement_share_links")
    .select(
      "id, group_id, share_token, from_date_utc, to_date_utc, creator_name, payee_name, payment_method, account_name, account_number, notes, payment_qr_data_url, receiver_payment_infos_json, created_at_utc"
    )
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("created_at_utc", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? toActiveShare(data as ActiveShareRow) : null;
}

export async function createShare(groupId: string, payload: SettlementSharePayload): Promise<string> {
  return regenerateShare(groupId, payload);
}

export async function regenerateShare(groupId: string, payload: SettlementSharePayload): Promise<string> {
  const group = await getGroup(groupId);
  if (!group) throw new Error("Group not found.");
  if (group.status !== GROUP_STATUS.settling) {
    throw new Error("Public share links can only be generated while the group is settling.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_settlement_share", {
    p_group_id: groupId,
    p_payload: toRpcPayload(payload),
  });

  if (error) {
    if (isMissingRpcError(error)) {
      return regenerateShareDirect(groupId, payload);
    }
    throw error;
  }
  if (typeof data !== "string" || !data) {
    throw new Error("Share token was not returned.");
  }
  return data;
}

async function regenerateShareDirect(groupId: string, payload: SettlementSharePayload) {
  const supabase = await createClient();
  const { error: deactivateError } = await supabase
    .from("settlement_share_links")
    .update({ is_active: false })
    .eq("group_id", groupId)
    .eq("is_active", true);

  if (deactivateError) throw deactivateError;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shareToken = createShareToken();
    const { error } = await supabase.from("settlement_share_links").insert({
      ...toStoragePayload(payload),
      group_id: groupId,
      is_active: true,
      share_token: shareToken,
    });

    if (!error) return shareToken;
    if (error.code !== "23505") throw error;
  }

  throw new Error("Share token was not returned.");
}

export async function deactivateShare(groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("deactivate_settlement_share", {
    p_group_id: groupId,
  });

  if (error) {
    if (isMissingRpcError(error)) {
      const { error: updateError } = await supabase
        .from("settlement_share_links")
        .update({ is_active: false })
        .eq("group_id", groupId)
        .eq("is_active", true);

      if (updateError) throw updateError;
      return;
    }
    throw error;
  }
}

export async function resolvePublicShare(token: string) {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("resolve_share_token", {
    p_token: token,
  });

  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const payload = data as unknown as PublicSettlementShare;
  const detailedPayload = await getPublicShareDetails(token).catch(() => null);

  return {
    ...payload,
    group_name: detailedPayload?.group_name ?? payload.group_name ?? null,
    bills: detailedPayload?.bills ?? [],
    participants: detailedPayload?.participants ?? [],
    transfers: detailedPayload?.transfers ?? (Array.isArray(payload.transfers) ? payload.transfers : []),
  };
}

async function getPublicShareDetails(token: string) {
  const supabase = createServiceRoleClient();
  const { data: link, error: linkError } = await supabase
    .from("settlement_share_links")
    .select(
      "id, group_id, share_token, from_date_utc, to_date_utc, creator_name, payee_name, payment_method, account_name, account_number, notes, payment_qr_data_url, receiver_payment_infos_json, created_at_utc"
    )
    .eq("share_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (linkError) throw linkError;
  if (!link) return null;

  const row = link as ActiveShareWithGroupRow;
  const window = {
    fromDateUtc: row.from_date_utc,
    toDateUtc: row.to_date_utc,
  } satisfies SettlementDateWindow;

  const [groupResult, participants, billRows] = await Promise.all([
    supabase.from("groups").select("name").eq("id", row.group_id).single(),
    listPublicShareParticipants(row.group_id),
    listPublicShareBillRows(row.group_id, window),
  ]);
  if (groupResult.error) throw groupResult.error;
  const bills = (billRows as unknown as BillProjectionRow[]).map(projectBillToDetail);
  const participantById = new Map(participants.map((participant) => [participant.id, participant.name]));
  const snapshot = buildSnapshotFromRows(
    participants as SettlementParticipantRow[],
    billRows as unknown as SettlementBillRow[],
    window
  );
  const transferKeys = snapshot.transfers.map((transfer) => buildTransferKey(row.group_id, row.from_date_utc, row.to_date_utc, transfer));
  const confirmations = await listPublicShareConfirmations(row.group_id, transferKeys);
  const confirmationByKey = new Map(confirmations.map((confirmation) => [confirmation.transfer_key, confirmation]));

  return {
    group_name: groupResult.data.name,
    bills: bills.map((bill) => ({
      currency_code: bill.currencyCode,
      grand_total_amount: bill.grandTotalAmount,
      id: bill.id,
      items: bill.items.map((item) => ({
        amount: item.amount,
        description: item.description,
        id: item.id,
        responsible_participant_ids: item.responsibleParticipantIds,
        responsible_participant_names: item.responsibleParticipantIds
          .map((participantId) => participantById.get(participantId) ?? "")
          .filter(Boolean),
      })),
      payer_name: participantById.get(bill.primaryPayerParticipantId) ?? "",
      primary_payer_participant_id: bill.primaryPayerParticipantId,
      shares: bill.shares.map((share) => ({
        participant_id: share.participantId,
        participant_name: participantById.get(share.participantId) ?? "",
        total_share_amount: share.totalShareAmount,
      })),
      store_name: bill.storeName,
      transaction_date_utc: bill.transactionDateUtc,
    })),
    participants: participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
    })),
    transfers: snapshot.transfers.map((transfer) => {
      const transferKey = buildTransferKey(row.group_id, row.from_date_utc, row.to_date_utc, transfer);
      const confirmation = confirmationByKey.get(transferKey);
      return {
        amount: transfer.amount,
        from_name: participantById.get(transfer.fromParticipantId) ?? "",
        from_participant_id: transfer.fromParticipantId,
        marked_paid_at_utc: confirmation?.marked_paid_at_utc ?? null,
        marked_received_at_utc: confirmation?.marked_received_at_utc ?? null,
        proof_screenshot_data_url: confirmation?.proof_screenshot_data_url ?? null,
        status: confirmation?.status ?? 0,
        to_name: participantById.get(transfer.toParticipantId) ?? "",
        to_participant_id: transfer.toParticipantId,
        transfer_key: transferKey,
      };
    }),
  };
}

async function listPublicShareParticipants(groupId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, group_id, name, username, invited_user_id, invitation_status, created_at_utc")
    .eq("group_id", groupId)
    .order("created_at_utc", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

async function listPublicShareBillRows(groupId: string, window: SettlementDateWindow) {
  const supabase = createServiceRoleClient();
  let query = supabase.from("bills").select(billSelect).eq("group_id", groupId);

  if (window.fromDateUtc) query = query.gte("transaction_date_utc", window.fromDateUtc);
  if (window.toDateUtc) query = query.lte("transaction_date_utc", window.toDateUtc);

  const { data, error } = await query.order("transaction_date_utc", { ascending: false });
  if (error) throw error;
  return data;
}

async function listPublicShareConfirmations(groupId: string, transferKeys: string[]) {
  if (!transferKeys.length) return [] as ConfirmationRow[];

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("settlement_transfer_confirmations")
    .select("id, group_id, transfer_key, from_participant_id, to_participant_id, amount, from_date_utc, to_date_utc, status, proof_screenshot_data_url, marked_paid_at_utc, marked_received_at_utc, updated_at_utc")
    .eq("group_id", groupId)
    .in("transfer_key", transferKeys);

  if (error) throw error;
  return data as ConfirmationRow[];
}

export async function recordPublicShareTransferAction(input: {
  action: "mark_paid" | "mark_received";
  amount: string;
  fromParticipantId: string;
  proofScreenshotDataUrl?: string | null;
  toParticipantId: string;
  token: string;
  transferKey: string;
}) {
  const supabase = createServiceRoleClient();
  const { data: link, error: linkError } = await supabase
    .from("settlement_share_links")
    .select("group_id, from_date_utc, to_date_utc")
    .eq("share_token", input.token)
    .eq("is_active", true)
    .maybeSingle();

  if (linkError) throw linkError;
  if (!link) throw new Error("share.notFound");

  const window = {
    fromDateUtc: link.from_date_utc,
    toDateUtc: link.to_date_utc,
  } satisfies SettlementDateWindow;
  const [groupResult, participants, billRows] = await Promise.all([
    supabase
      .from("groups")
      .select("name, created_by_user_id")
      .eq("id", link.group_id)
      .single(),
    listPublicShareParticipants(link.group_id),
    listPublicShareBillRows(link.group_id, window),
  ]);
  if (groupResult.error) throw groupResult.error;
  const snapshot = buildSnapshotFromRows(
    participants as SettlementParticipantRow[],
    billRows as unknown as SettlementBillRow[],
    window
  );
  const transfer = snapshot.transfers.find((candidate) => {
    const transferKey = buildTransferKey(link.group_id, link.from_date_utc, link.to_date_utc, candidate);
    return (
      transferKey === input.transferKey &&
      candidate.fromParticipantId === input.fromParticipantId &&
      candidate.toParticipantId === input.toParticipantId &&
      Number(candidate.amount).toFixed(2) === Number(input.amount).toFixed(2)
    );
  });

  if (!transfer) throw new Error("share.transferNotFound");

  const now = new Date().toISOString();
  const { data: current, error: currentError } = await supabase
    .from("settlement_transfer_confirmations")
    .select("status")
    .eq("group_id", link.group_id)
    .eq("transfer_key", input.transferKey)
    .maybeSingle();

  if (currentError) throw currentError;
  if (input.action === "mark_received" && (!current || current.status < 1)) {
    throw new Error("share.markPaidFirst");
  }

  const payload = {
    amount: Number(Number(input.amount).toFixed(2)),
    from_date_utc: link.from_date_utc,
    from_participant_id: input.fromParticipantId,
    group_id: link.group_id,
    marked_paid_at_utc:
      input.action === "mark_paid" || !current ? now : undefined,
    marked_received_at_utc: input.action === "mark_received" ? now : undefined,
    proof_screenshot_data_url: input.proofScreenshotDataUrl || undefined,
    status: input.action === "mark_paid" ? 1 : 2,
    to_date_utc: link.to_date_utc,
    to_participant_id: input.toParticipantId,
    transfer_key: input.transferKey,
    updated_at_utc: now,
  };

  const { error } = await supabase
    .from("settlement_transfer_confirmations")
    .upsert(payload, { onConflict: "group_id,transfer_key" });

  if (error) throw error;

  const transferKeys = snapshot.transfers.map((candidate) =>
    buildTransferKey(link.group_id, link.from_date_utc, link.to_date_utc, candidate)
  );
  const confirmations = await listPublicShareConfirmations(link.group_id, transferKeys);
  const statusByKey = new Map(confirmations.map((confirmation) => [confirmation.transfer_key, confirmation.status]));
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const changed = input.action === "mark_paid" ? !current || current.status < 1 : Boolean(current && current.status < 2);

  return {
    ...input,
    actorName:
      participantById.get(
        input.action === "mark_paid" ? input.fromParticipantId : input.toParticipantId
      )?.name ?? groupResult.data.name,
    allReceived:
      changed &&
      input.action === "mark_received" &&
      areAllStatusesReceived(
        snapshot.transfers.map((candidate) =>
          statusByKey.get(
            buildTransferKey(link.group_id, link.from_date_utc, link.to_date_utc, candidate)
          )
        )
      ),
    changed,
    fromUserId: participantById.get(input.fromParticipantId)?.invited_user_id ?? null,
    groupId: link.group_id,
    groupName: groupResult.data.name,
    organizerUserId: groupResult.data.created_by_user_id,
    status: payload.status,
    toUserId: participantById.get(input.toParticipantId)?.invited_user_id ?? null,
    markedPaidAtUtc: payload.marked_paid_at_utc ?? now,
    markedReceivedAtUtc: payload.marked_received_at_utc ?? null,
  };
}
