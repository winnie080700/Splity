import { describe, expect, it } from "vitest";

import { Money, MoneyScaleError, roundCurrency, toCents, Weight } from "./Money";

describe("Money", () => {
  it("accepts scale 2 money values", () => {
    expect(new Money("12.34").toString()).toBe("12.34");
  });

  it("rejects scale 3 money values", () => {
    expect(() => new Money("1.234")).toThrow(MoneyScaleError);
  });

  it("rejects scale 4 money values", () => {
    expect(() => new Money("1.2345")).toThrow(MoneyScaleError);
  });

  it("adds money values", () => {
    expect(new Money("12.34").add(new Money("0.01")).toString()).toBe("12.35");
  });

  it("rounds half away from zero", () => {
    expect(roundCurrency("2.345").toFixed(2)).toBe("2.35");
    expect(roundCurrency("-2.345").toFixed(2)).toBe("-2.35");
  });

  it("multiplies and rounds to currency scale", () => {
    expect(new Money("1.00").mul(100).toString()).toBe("100.00");
  });

  it("converts money to cents", () => {
    expect(new Money("12.50").toCents()).toBe(1250);
    expect(toCents("2.345")).toBe(235);
  });

  it("accepts scale 4 weights and rejects scale 5 weights", () => {
    expect(new Weight("0.1234").toString()).toBe("0.1234");
    expect(() => new Weight("0.12345")).toThrow(MoneyScaleError);
  });
});
