import { describe, expect, it } from "vitest";

import { areAllStatusesReceived } from "./settlement-notifications";

describe("areAllStatusesReceived", () => {
  it("requires at least one transfer and every transfer to be received", () => {
    expect(areAllStatusesReceived([])).toBe(false);
    expect(areAllStatusesReceived([2, 1])).toBe(false);
    expect(areAllStatusesReceived([2, 2])).toBe(true);
  });
});
