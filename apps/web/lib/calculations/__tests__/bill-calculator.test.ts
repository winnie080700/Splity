import { describe, expect, it } from "vitest";

import { BillValidationError, calculateBillShares } from "../bill-calculator";
import { FIXTURES, INVALID_FIXTURES } from "./fixtures";

describe("calculateBillShares", () => {
  it.each(FIXTURES)("$id $label matches C# output", (fixture) => {
    expect(calculateBillShares(fixture.input)).toEqual(fixture.expected);
  });

  it.each(INVALID_FIXTURES)("$id throws the C# validation message", (fixture) => {
    expect(() => calculateBillShares(fixture.input)).toThrow(BillValidationError);
    expect(() => calculateBillShares(fixture.input)).toThrow(fixture.message);
  });
});
