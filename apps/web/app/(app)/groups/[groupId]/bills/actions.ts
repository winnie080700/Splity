"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";

import {
  createBill,
  deleteBill,
  updateBill,
  type BillWriteInput,
} from "@/lib/services/bills";
import { FEE_TYPE, SPLIT_MODE } from "@/lib/calculations/types";
import { serverErrorMessage, serverT } from "@/lib/i18n/server";
import { zodErrorMessage } from "@/lib/validation/zod";

export type BillActionState = {
  error: string | null;
};

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => value.trim().length > 0 && Number.isFinite(Number(value)), {
    message: "bills.error.invalidPayload",
  });

const billPayloadSchema = z.object({
  storeName: z.string().trim().min(1, "bills.error.storeNameRequired"),
  referenceImageDataUrl: z.string().nullable().optional(),
  transactionDateUtc: z.string().min(1, "bills.error.transactionDateRequired"),
  splitMode: z
    .number()
    .refine((value) => value === SPLIT_MODE.equal || value === SPLIT_MODE.weighted, {
      message: "bills.error.unsupportedSplitMode",
    }),
  primaryPayerParticipantId: z.string().min(1, "bills.error.primaryPayerRequired"),
  participantSplits: z
    .array(
      z.object({
        participantId: z.string().min(1, "bills.error.participantRequired"),
        weight: amountSchema,
      })
    )
    .min(1, "bills.error.participantRequired"),
  items: z.array(
    z.object({
      id: z.string().optional(),
      description: z.string().trim().min(1, "bills.error.itemDescriptionRequired"),
      amount: amountSchema,
      responsibleParticipantIds: z
        .array(z.string().min(1, "bills.error.participantRequired"))
        .min(1, "bills.error.participantRequired"),
    })
  ),
  fees: z.array(
    z.object({
      name: z.string().trim().min(1, "bills.error.invalidPayload"),
      feeType: z
        .number()
        .refine((value) => value === FEE_TYPE.percentage || value === FEE_TYPE.fixed, {
          message: "bills.error.unsupportedFeeType",
        }),
      value: amountSchema,
    }).refine((fee) => fee.feeType !== FEE_TYPE.percentage || Number(fee.value) >= 0, {
      message: "bills.error.percentageFeeNonNegative",
      path: ["value"],
    })
  ),
  extraContributions: z.array(
    z.object({
      participantId: z.string().min(1, "bills.error.participantRequired"),
      amount: amountSchema,
    })
  ),
});

function fail(error: string): BillActionState {
  return { error };
}

function parsePayload(formData: FormData): BillWriteInput {
  const raw = String(formData.get("payload") ?? "");
  const payload = billPayloadSchema.parse(JSON.parse(raw));

  return {
    storeName: payload.storeName,
    referenceImageDataUrl: payload.referenceImageDataUrl ?? null,
    transactionDateUtc: payload.transactionDateUtc,
    currencyCode: "MYR",
    splitMode: payload.splitMode,
    primaryPayerParticipantId: payload.primaryPayerParticipantId,
    participantSplits: payload.participantSplits,
    items: payload.items.map((item) => ({
      id: item.id,
      description: item.description,
      amount: item.amount,
      responsibleParticipantIds: item.responsibleParticipantIds,
    })),
    fees: payload.fees.map((fee) => ({
      name: fee.name,
      feeType: fee.feeType === FEE_TYPE.percentage ? FEE_TYPE.percentage : FEE_TYPE.fixed,
      value: fee.value,
    })),
    extraContributions: payload.extraContributions,
  };
}

async function getBillErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return zodErrorMessage(error, "bills.error.invalidPayload");
  }

  if (error instanceof SyntaxError) {
    return serverT("bills.error.invalidPayload");
  }

  return serverErrorMessage(error, "bills.error.saveFailed");
}

export async function createBillAction(
  groupId: string,
  _prevState: BillActionState,
  formData: FormData
): Promise<BillActionState> {
  try {
    await createBill(groupId, parsePayload(formData));
  } catch (error) {
    return fail(await getBillErrorMessage(error));
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function updateBillAction(
  groupId: string,
  billId: string,
  _prevState: BillActionState,
  formData: FormData
): Promise<BillActionState> {
  try {
    await updateBill(groupId, billId, parsePayload(formData));
  } catch (error) {
    return fail(await getBillErrorMessage(error));
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/bills/${billId}`);
  redirect(`/groups/${groupId}`);
}

export async function deleteBillAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const billId = String(formData.get("billId") ?? "");
  if (!groupId || !billId) return;

  await deleteBill(groupId, billId);
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}
