import Decimal from "decimal.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export class MoneyScaleError extends Error {
  constructor(value: string, maxScale: number) {
    super(`Money value "${value}" exceeds max scale ${maxScale}`);
    this.name = "MoneyScaleError";
  }
}

function getScale(input: string) {
  const match = input.match(/\.(\d+)$/);
  return match ? match[1].length : 0;
}

export function roundCurrency(input: Decimal.Value) {
  return new Decimal(input).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function toCents(input: Decimal.Value) {
  return new Decimal(input).mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export class Money {
  protected static readonly maxScale: number = 2;
  protected readonly value: Decimal;

  constructor(input: string | Decimal) {
    if (typeof input === "string") {
      const maxScale = (this.constructor as typeof Money).maxScale;
      const scale = getScale(input);

      if (scale > maxScale) {
        throw new MoneyScaleError(input, maxScale);
      }
    }

    this.value = new Decimal(input);
  }

  add(other: Money) {
    return new Money(this.value.plus(other.value));
  }

  sub(other: Money) {
    return new Money(this.value.minus(other.value));
  }

  mul(factor: Decimal.Value) {
    return new Money(roundCurrency(this.value.mul(factor)));
  }

  round() {
    return new Money(roundCurrency(this.value));
  }

  toCents() {
    return toCents(this.value);
  }

  toString() {
    return this.value.toFixed(2);
  }
}

export class Weight extends Money {
  protected static readonly maxScale: number = 4;

  toString() {
    return this.value.toFixed(4);
  }
}
