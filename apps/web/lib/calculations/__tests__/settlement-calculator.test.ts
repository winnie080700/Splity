import { describe, expect, it } from "vitest";

import { calculateTransfers, SettlementValidationError } from "../settlement-calculator";
import { INVALID_SETTLEMENT_FIXTURES, SETTLEMENT_FIXTURES } from "./settlement-fixtures";

describe("calculateTransfers", () => {
  it.each(SETTLEMENT_FIXTURES)("$id matches C# output", (fixture) => {
    expect(calculateTransfers(fixture.input)).toEqual(fixture.expected);
  });

  it.each(INVALID_SETTLEMENT_FIXTURES)("$id throws the expected validation error", (fixture) => {
    expect(() => calculateTransfers(fixture.input)).toThrow(SettlementValidationError);
    expect(() => calculateTransfers(fixture.input)).toThrow(fixture.message);
  });

  it("throws for null input", () => {
    expect(() => calculateTransfers(null as never)).toThrow(TypeError);
  });
});
