"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { serverErrorMessage, serverT } from "@/lib/i18n/server";
import { createGroup } from "@/lib/services/groups";
import { createParticipant, listParticipants } from "@/lib/services/participants";
import { createBill } from "@/lib/services/bills";
import { searchUserByUsername } from "@/lib/services/users";
import { FEE_TYPE, SPLIT_MODE } from "@/lib/calculations/types";

export type InviteLookupState = {
  error: string | null;
  lookup: { id: string; name: string; username: string } | null;
};

export type SetupPhaseResult<T> = {
  data: T | null;
  error: string | null;
};

const participantSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(150),
  username: z.string().trim().nullable().optional(),
});

const billSchema = z.object({
  storeName: z.string().trim().min(1).max(200),
  transactionDateUtc: z.string().trim().min(1),
  currencyCode: z.string().trim().optional(),
  splitMode: z.number().refine((value) => value === SPLIT_MODE.equal || value === SPLIT_MODE.weighted),
  primaryPayerParticipantId: z.string().trim().min(1),
  participantSplits: z.array(
    z.object({
      participantId: z.string().trim().min(1),
      weight: z.string().trim().min(1),
    })
  ).min(1),
  items: z.array(
    z.object({
      id: z.string().optional(),
      description: z.string().trim().min(1),
      amount: z.string().trim().min(1),
      responsibleParticipantIds: z.array(z.string().trim().min(1)).min(1),
    })
  ).min(1),
  fees: z.array(
    z.object({
      name: z.string().trim().min(1),
      feeType: z.number().refine((value) => value === FEE_TYPE.percentage || value === FEE_TYPE.fixed),
      value: z.string().trim().min(1),
    })
  ),
});

const createGroupPhaseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  ownerParticipantId: z.string().trim().min(1),
});

const participantsPhaseSchema = z.object({
  groupId: z.string().uuid(),
  participants: z.array(participantSchema).max(50),
});

const billsPhaseSchema = z.object({
  groupId: z.string().uuid(),
  bills: z.array(billSchema).max(50),
  participantIdMap: z.record(z.string(), z.string().uuid()),
});

const groupIdSchema = z.string().uuid();

const inviteLookupSchema = z.object({
  username: z.string().trim().min(1),
});

export async function searchSetupInviteUserAction(
  _prevState: InviteLookupState,
  formData: FormData
): Promise<InviteLookupState> {
  const result = inviteLookupSchema.safeParse({
    username: String(formData.get("username") ?? ""),
  });

  if (!result.success) {
    return { error: await serverT("groupDetail.error.lookupUsernameRequired"), lookup: null };
  }

  try {
    const lookup = await searchUserByUsername(result.data.username);
    if (!lookup) return { error: null, lookup: null };
    return { error: null, lookup };
  } catch (error) {
    return { error: await serverErrorMessage(error, "groupDetail.error.lookupFailed"), lookup: null };
  }
}

export async function createSetupGroupPhaseAction(
  input: unknown
): Promise<SetupPhaseResult<{ groupId: string; participantIdMap: Record<string, string> }>> {
  try {
    const payload = createGroupPhaseSchema.parse(input);
    const group = await createGroup({ name: payload.name });
    const groupParticipants = await listParticipants(group.id);
    const ownerParticipant = groupParticipants.find((participant) => participant.invited_user_id === payload.ownerParticipantId);
    if (!ownerParticipant) throw new Error("Owner participant is missing from this group.");

    return {
      data: {
        groupId: group.id,
        participantIdMap: { [payload.ownerParticipantId]: ownerParticipant.id },
      },
      error: null,
    };
  } catch (error) {
    return phaseError(error);
  }
}

export async function saveSetupParticipantsPhaseAction(
  input: unknown
): Promise<SetupPhaseResult<Record<string, string>>> {
  try {
    const payload = participantsPhaseSchema.parse(input);
    const participantIdMap: Record<string, string> = {};

    for (const participant of payload.participants) {
      const createdParticipant = await createParticipant({
        groupId: payload.groupId,
        name: participant.name,
        username: participant.username ?? null,
      });
      participantIdMap[participant.id] = createdParticipant.id;
    }

    return { data: participantIdMap, error: null };
  } catch (error) {
    return phaseError(error);
  }
}

export async function saveSetupBillsPhaseAction(
  input: unknown
): Promise<SetupPhaseResult<true>> {
  try {
    const payload = billsPhaseSchema.parse(input);
    const groupParticipantIds = new Set(
      (await listParticipants(payload.groupId)).map((participant) => participant.id)
    );
    if (
      Object.values(payload.participantIdMap).some(
        (participantId) => !groupParticipantIds.has(participantId)
      )
    ) {
      throw new Error("Bill participant is missing from this group.");
    }

    for (const bill of payload.bills) {
      await createBill(payload.groupId, {
        storeName: bill.storeName,
        transactionDateUtc: bill.transactionDateUtc,
        currencyCode: bill.currencyCode ?? "MYR",
        splitMode: bill.splitMode,
        primaryPayerParticipantId: remapParticipantId(payload.participantIdMap, bill.primaryPayerParticipantId),
        participantSplits: bill.participantSplits.map((split) => ({
          participantId: remapParticipantId(payload.participantIdMap, split.participantId),
          weight: split.weight,
        })),
        items: bill.items.map((item) => ({
          id: item.id,
          description: item.description,
          amount: item.amount,
          responsibleParticipantIds: item.responsibleParticipantIds.map((participantId) =>
            remapParticipantId(payload.participantIdMap, participantId)
          ),
        })),
        fees: bill.fees,
      });
    }

    return { data: true, error: null };
  } catch (error) {
    return phaseError(error);
  }
}

export async function finalizeGroupSetupPhaseAction(
  input: unknown
): Promise<SetupPhaseResult<{ success: string }>> {
  try {
    const groupId = groupIdSchema.parse(input);
    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`);
    return {
      data: { success: await serverT("createGroupSetup.completeSuccess") },
      error: null,
    };
  } catch (error) {
    return phaseError(error);
  }
}

async function phaseError<T>(error: unknown): Promise<SetupPhaseResult<T>> {
  return {
    data: null,
    error: await serverErrorMessage(error, "createGroupSetup.completeFailed"),
  };
}

function remapParticipantId(participantIdMap: Record<string, string>, draftId: string) {
  const participantId = participantIdMap[draftId];
  if (!participantId) throw new Error("Bill participant is missing from this group.");
  return participantId;
}
