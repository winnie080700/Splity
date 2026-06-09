import type { Json } from "@/lib/supabase/database.types";
import { GROUP_STATUS } from "@/lib/domain/status";
import { createAnonServerClient } from "@/lib/supabase/anon";
import { createClient } from "@/lib/supabase/server";
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

export type PublicShareTransfer = {
  from_participant_id?: string;
  from_name: string;
  to_participant_id?: string;
  to_name: string;
  amount: string;
  status: number;
  marked_paid_at_utc: string | null;
  marked_received_at_utc: string | null;
};

export type PublicSettlementShare = {
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

function toRpcPayload(input: SettlementSharePayload): Json {
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

export async function createShare(groupId: string, payload: SettlementSharePayload) {
  return regenerateShare(groupId, payload);
}

export async function regenerateShare(groupId: string, payload: SettlementSharePayload) {
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

  if (error) throw error;
  return data;
}

export async function deactivateShare(groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("deactivate_settlement_share", {
    p_group_id: groupId,
  });

  if (error) throw error;
}

export async function resolvePublicShare(token: string) {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("resolve_share_token", {
    p_token: token,
  });

  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const payload = data as unknown as PublicSettlementShare;
  return {
    ...payload,
    transfers: Array.isArray(payload.transfers) ? payload.transfers : [],
  };
}
