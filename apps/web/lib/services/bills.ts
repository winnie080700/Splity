import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { GROUP_STATUS } from "@/lib/domain/status";
import { listParticipants } from "@/lib/services/participants";
import {
  projectBillToDetail,
  projectBillToSummary,
  type BillDetail,
  type BillProjectionRow,
  type BillSummary,
} from "@/lib/calculations/bill-read-projection";
import {
  SPLIT_MODE,
  type BillCalculationInput,
  type BillCalculationItemInput,
  type FeeType,
  type SplitMode,
} from "@/lib/calculations/types";
import { calculateBillShares } from "@/lib/calculations/bill-calculator";
import { requireBillEditor } from "@/lib/services/group-permissions";

class GroupLockedError extends Error {
  constructor() {
    super("This group is locked because settlement has already started.");
    this.name = "GroupLockedError";
  }
}

export type BillWriteInput = {
  storeName: string;
  referenceImageDataUrl?: string | null;
  transactionDateUtc: string;
  currencyCode?: string;
  splitMode: SplitMode;
  primaryPayerParticipantId: string;
  participantSplits: { participantId: string; weight: string }[];
  items: BillCalculationItemInput[];
  fees: { name: string; feeType: FeeType; value: string }[];
};

export const billSelect = `
  id,
  group_id,
  store_name,
  reference_image_data_url,
  transaction_date_utc,
  currency_code,
  split_mode,
  primary_payer_participant_id,
  created_at_utc,
  updated_at_utc,
  bill_items (
    id,
    bill_id,
    description,
    amount,
    bill_item_responsibilities (
      participant_id
    )
  ),
  bill_fees (
    id,
    bill_id,
    name,
    fee_type,
    value
  ),
  bill_shares (
    id,
    bill_id,
    participant_id,
    weight,
    pre_fee_amount,
    fee_amount,
    total_share_amount
  )
`;

async function requireEditableGroup(groupId: string) {
  const permissions = await requireBillEditor(groupId);
  if (permissions.group.status !== GROUP_STATUS.unresolved) throw new GroupLockedError();
  return permissions.group;
}

function normalizeInput(input: BillWriteInput): BillCalculationInput {
  return {
    participantSplits:
      input.splitMode === SPLIT_MODE.equal
        ? input.participantSplits.map((split) => ({ participantId: split.participantId, weight: "1.0000" }))
        : input.participantSplits,
    items: input.items,
    fees: input.fees,
    primaryPayerParticipantId: input.primaryPayerParticipantId,
  };
}

function buildRpcPayload(input: BillWriteInput): Json {
  const calculationInput = normalizeInput(input);
  const result = calculateBillShares(calculationInput);
  const itemIds = input.items.map((item) => item.id ?? crypto.randomUUID());

  return {
    store_name: input.storeName,
    reference_image_data_url: input.referenceImageDataUrl ?? null,
    transaction_date_utc: input.transactionDateUtc,
    currency_code: input.currencyCode ?? "MYR",
    split_mode: input.splitMode,
    primary_payer_participant_id: input.primaryPayerParticipantId,
    items: input.items.map((item, index) => ({
      id: itemIds[index],
      description: item.description,
      amount: item.amount,
    })),
    fees: input.fees.map((fee) => ({
      id: crypto.randomUUID(),
      name: fee.name,
      fee_type: fee.feeType,
      value: fee.value,
    })),
    shares: result.shares.map((share) => ({
      id: crypto.randomUUID(),
      participant_id: share.participantId,
      weight: share.weight,
      pre_fee_amount: share.preFeeAmount,
      fee_amount: share.feeAmount,
      total_share_amount: share.totalShareAmount,
    })),
    responsibilities: input.items.flatMap((item, index) =>
      item.responsibleParticipantIds.map((participantId) => ({
        id: crypto.randomUUID(),
        bill_item_id: itemIds[index],
        participant_id: participantId,
      }))
    ),
  } satisfies Json;
}

export async function listBills(groupId: string): Promise<BillSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bills")
    .select(billSelect)
    .eq("group_id", groupId)
    .order("transaction_date_utc", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data as unknown as BillProjectionRow[]).map(projectBillToSummary);
}

export async function listBillDetails(groupId: string): Promise<BillDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bills")
    .select(billSelect)
    .eq("group_id", groupId)
    .order("transaction_date_utc", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data as unknown as BillProjectionRow[]).map(projectBillToDetail);
}

export async function getBill(groupId: string, billId: string): Promise<BillDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bills")
    .select(billSelect)
    .eq("group_id", groupId)
    .eq("id", billId)
    .maybeSingle();

  if (error) throw error;
  return data ? projectBillToDetail(data as unknown as BillProjectionRow) : null;
}

export async function createBill(groupId: string, input: BillWriteInput) {
  await requireEditableGroup(groupId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_bill_with_items", {
    p_group_id: groupId,
    p_input: buildRpcPayload(input),
  });

  if (error) throw error;
  return data;
}

export async function updateBill(groupId: string, billId: string, input: BillWriteInput) {
  await requireEditableGroup(groupId);

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_bill_with_items", {
    p_bill_id: billId,
    p_input: buildRpcPayload(input),
  });

  if (error) throw error;
}

export async function deleteBill(groupId: string, billId: string) {
  await requireEditableGroup(groupId);

  const supabase = await createClient();
  const { error } = await supabase.from("bills").delete().eq("group_id", groupId).eq("id", billId);
  if (error) throw error;
}

export async function listBillFormParticipants(groupId: string) {
  return listParticipants(groupId);
}
