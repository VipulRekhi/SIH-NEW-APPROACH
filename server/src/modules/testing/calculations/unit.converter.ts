import { DecimalUtils, Decimal } from './decimal.utils.js';

export type MassUnit = 'mg' | 'g' | 'kg' | 't';

const CONVERSION_FACTORS_TO_KG: Record<MassUnit, Decimal> = {
  mg: DecimalUtils.from('0.000001'),
  g: DecimalUtils.from('0.001'),
  kg: DecimalUtils.from('1'),
  t: DecimalUtils.from('1000')
};

export class UnitConverter {
  static normalizeUnit(unitStr: string): MassUnit {
    const clean = unitStr.trim().toLowerCase();
    if (clean === 'mg' || clean === 'milligram' || clean === 'milligrams') return 'mg';
    if (clean === 'g' || clean === 'gram' || clean === 'grams') return 'g';
    if (clean === 'kg' || clean === 'kilogram' || clean === 'kilograms') return 'kg';
    if (clean === 't' || clean === 'tonne' || clean === 'ton' || clean === 'tonnes') return 't';
    throw new Error(`Unsupported legal metrology unit: "${unitStr}". Supported units: mg, g, kg, t.`);
  }

  static toCanonical(value: number | string | Decimal, fromUnit: string): Decimal {
    const unit = this.normalizeUnit(fromUnit);
    const factor = CONVERSION_FACTORS_TO_KG[unit];
    return DecimalUtils.mul(value, factor);
  }

  static fromCanonical(valueInKg: number | string | Decimal, toUnit: string): Decimal {
    const unit = this.normalizeUnit(toUnit);
    const factor = CONVERSION_FACTORS_TO_KG[unit];
    return DecimalUtils.div(valueInKg, factor);
  }

  static convert(value: number | string | Decimal, fromUnit: string, toUnit: string): Decimal {
    const from = this.normalizeUnit(fromUnit);
    const to = this.normalizeUnit(toUnit);
    if (from === to) {
      return DecimalUtils.from(value);
    }
    const valInKg = this.toCanonical(value, from);
    return this.fromCanonical(valInKg, to);
  }
}
