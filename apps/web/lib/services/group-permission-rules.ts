import { GROUP_STATUS } from "../domain/status";

export function deriveGroupPermissions(input: {
  member: boolean;
  organizer: boolean;
  status: number;
}) {
  return {
    canAccess: input.organizer || input.member,
    canManageGroup: input.organizer,
    canManageParticipants: input.organizer,
    canWriteBills: (input.organizer || input.member) && input.status === GROUP_STATUS.unresolved,
  };
}
