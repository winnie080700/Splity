import { describe, expect, it } from "vitest";

import { buildSnapshotFromRows, buildTransferKey, getTransferFromSnapshot } from "../settlement-snapshot";
import { PARTICIPANTS, p1, p2, p3 } from "./settlement-fixtures";

describe("buildSnapshotFromRows", () => {
  it("builds net balances from one bill", () => {
    const snapshot = buildSnapshotFromRows(PARTICIPANTS, [
      {
        id: "bill-1",
        transaction_date_utc: "2026-05-15T00:00:00.000Z",
        bill_shares: [
          { participant_id: p1, total_share_amount: "30.00" },
          { participant_id: p2, total_share_amount: "30.00" },
          { participant_id: p3, total_share_amount: "30.00" },
        ],
        payment_contributions: [{ participant_id: p1, amount: "90.00" }],
      },
    ]);

    expect(snapshot.netBalances).toEqual([
      { participantId: p1, netAmount: "60.00" },
      { participantId: p2, netAmount: "-30.00" },
      { participantId: p3, netAmount: "-30.00" },
    ]);
    expect(snapshot.transfers).toEqual([
      { fromParticipantId: p2, toParticipantId: p1, amount: "30.00" },
      { fromParticipantId: p3, toParticipantId: p1, amount: "30.00" },
    ]);
  });

  it("accumulates overlapping bills and applies date filters", () => {
    const bills = [
      {
        id: "bill-1",
        transaction_date_utc: "2026-05-15T00:00:00.000Z",
        bill_shares: [{ participant_id: p1, total_share_amount: "10.00" }],
        payment_contributions: [{ participant_id: p2, amount: "10.00" }],
      },
      {
        id: "bill-2",
        transaction_date_utc: "2026-05-16T00:00:00.000Z",
        bill_shares: [{ participant_id: p2, total_share_amount: "8.00" }],
        payment_contributions: [{ participant_id: p3, amount: "8.00" }],
      },
    ];

    expect(buildSnapshotFromRows(PARTICIPANTS, bills).netBalances).toEqual([
      { participantId: p1, netAmount: "-10.00" },
      { participantId: p2, netAmount: "2.00" },
      { participantId: p3, netAmount: "8.00" },
    ]);
    expect(
      buildSnapshotFromRows(PARTICIPANTS, bills, {
        fromDateUtc: "2026-05-16T00:00:00.000Z",
        toDateUtc: "2026-05-16T23:59:59.999Z",
      }).netBalances
    ).toEqual([
      { participantId: p1, netAmount: "0.00" },
      { participantId: p2, netAmount: "-8.00" },
      { participantId: p3, netAmount: "8.00" },
    ]);
  });
});

describe("buildTransferKey", () => {
  it("formats null date keys", () => {
    expect(
      buildTransferKey(
        "00000000-0000-0000-0000-000000000001",
        null,
        null,
        { fromParticipantId: p1, toParticipantId: p2, amount: "50.00" }
      )
    ).toBe(
      "00000000000000000000000000000001:none:none:00000000000000000000000000000001:00000000000000000000000000000002:50.00"
    );
  });

  it("formats UTC dates with C# round-trip precision", () => {
    expect(
      buildTransferKey(
        "00000000-0000-0000-0000-000000000001",
        "2026-05-15T12:34:56.789Z",
        "2026-05-16T01:02:03.004Z",
        { fromParticipantId: p1, toParticipantId: p2, amount: "50" }
      )
    ).toContain("2026-05-15T12:34:56.7890000Z:2026-05-16T01:02:03.0040000Z");
  });

  it("finds transfers by rounded amount", () => {
    const snapshot = buildSnapshotFromRows(PARTICIPANTS, [
      {
        id: "bill-1",
        transaction_date_utc: "2026-05-15T00:00:00.000Z",
        bill_shares: [{ participant_id: p1, total_share_amount: "20.00" }],
        payment_contributions: [{ participant_id: p2, amount: "20.00" }],
      },
    ]);

    expect(getTransferFromSnapshot(snapshot, { fromParticipantId: p1, toParticipantId: p2, amount: "20.004" })).toEqual({
      fromParticipantId: p1,
      toParticipantId: p2,
      amount: "20.00",
    });
  });
});
