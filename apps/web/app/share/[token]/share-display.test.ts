import { describe, expect, it } from "vitest";

import type { PublicSettlementShare } from "@/lib/services/settlement-shares";
import { identitySummary } from "./share-display-utils";

describe("identitySummary", () => {
  it("uses the existing transfers to derive a participant's displayed balance", () => {
    const share = {
      transfers: [
        { amount: "25.50", from_participant_id: "person", status: 2, to_participant_id: "receiver" },
        { amount: "5.00", from_participant_id: "payer", status: 2, to_participant_id: "person" },
      ],
    } as PublicSettlementShare;

    expect(identitySummary(share, { id: "person", name: "Sam" })).toMatchObject({
      completed: true,
      incoming: 5,
      net: -20.5,
      outgoing: 25.5,
      roleKey: "share.roleBoth",
    });
  });

  it("does not mark an identity complete while any related transfer is unfinished", () => {
    const share = {
      transfers: [
        { amount: "10", from_participant_id: "person", status: 2, to_participant_id: "a" },
        { amount: "20", from_participant_id: "person", status: 1, to_participant_id: "b" },
      ],
    } as PublicSettlementShare;

    expect(identitySummary(share, { id: "person", name: "Sam" }).completed).toBe(false);
  });
});
