import { Decimal } from 'decimal.js';

// Configure standard legal metrology decimal precision
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -12,
  toExpPos: 20
});

export class DecimalUtils {
  static from(value: number | string | Decimal | null | undefined): Decimal {
    if (value === null || value === undefined || value === '') {
      return new Decimal(0);
    }
    return new Decimal(value);
  }

  static add(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.from(a).plus(this.from(b));
  }

  static sub(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.from(a).minus(this.from(b));
  }

  static mul(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.from(a).times(this.from(b));
  }

  static div(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    const divisor = this.from(b);
    if (divisor.isZero()) {
      throw new Error('Division by zero in metrological calculation');
    }
    return this.from(a).dividedBy(divisor);
  }

  static abs(a: number | string | Decimal): Decimal {
    return this.from(a).abs();
  }

  static lte(a: number | string | Decimal, b: number | string | Decimal): boolean {
    return this.from(a).lessThanOrEqualTo(this.from(b));
  }

  static lt(a: number | string | Decimal, b: number | string | Decimal): boolean {
    return this.from(a).lessThan(this.from(b));
  }

  static gte(a: number | string | Decimal, b: number | string | Decimal): boolean {
    return this.from(a).greaterThanOrEqualTo(this.from(b));
  }

  static gt(a: number | string | Decimal, b: number | string | Decimal): boolean {
    return this.from(a).greaterThan(this.from(b));
  }

  static eq(a: number | string | Decimal, b: number | string | Decimal): boolean {
    return this.from(a).equals(this.from(b));
  }

  static toNumber(val: Decimal | number | string): number {
    return this.from(val).toNumber();
  }

  static round(val: Decimal | number | string, decimalPlaces: number = 6): Decimal {
    return this.from(val).toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
  }

  static format(val: Decimal | number | string, decimalPlaces?: number): string {
    const d = this.from(val);
    if (decimalPlaces !== undefined) {
      return d.toFixed(decimalPlaces);
    }
    return d.toString();
  }
}

export { Decimal };
