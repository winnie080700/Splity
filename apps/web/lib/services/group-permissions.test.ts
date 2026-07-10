import { describe, expect, it } from "vitest";

import { GROUP_STATUS } from "../domain/status";
import { deriveGroupPermissions } from "./group-permission-rules";

describe("deriveGroupPermissions", () => {
  it("keeps participant and group management organizer-only while allowing accepted members to edit open bills", () => {
    expect(deriveGroupPermissions({ member: false, organizer: true, status: GROUP_STATUS.unresolved })).toMatchObject({
      canAccess: true,
      canManageGroup: true,
      canManageParticipants: true,
      canWriteBills: true,
    });
    expect(deriveGroupPermissions({ member: true, organizer: false, status: GROUP_STATUS.unresolved })).toMatchObject({
      canAccess: true,
      canManageGroup: false,
      canManageParticipants: false,
      canWriteBills: true,
    });
    expect(deriveGroupPermissions({ member: false, organizer: false, status: GROUP_STATUS.unresolved })).toMatchObject({
      canAccess: false,
      canWriteBills: false,
    });
    expect(deriveGroupPermissions({ member: true, organizer: false, status: GROUP_STATUS.settling }).canWriteBills).toBe(false);
  });
});
