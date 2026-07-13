import { describe, expect, it } from "vitest";

import { transferActivitySummary } from "./activity-summary";

describe("transferActivitySummary", () => {
  it("uses the payer name and received status", () => {
    expect(
      transferActivitySummary(
        { fromParticipantId: "payer", status: 2 },
        new Map([["payer", "Winnie"]])
      )
    ).toEqual({
      messageKey: "groupDetail.activity.transfer_marked_received",
      name: "Winnie",
    });
  });
});
