import { DecimalUtils, Decimal } from './decimal.utils.js';

export interface ChangeoverPointResult {
  indicatedValue: Decimal;
  additionalLoad: Decimal;
  scaleIntervalE: Decimal;
  calculatedP: Decimal;
  formula: string;
}

export class ChangeoverCalculator {
  /**
   * Evaluates turning/changeover point per OIML R 76-1:2006 Clause A.4.4.3:
   * P = I + 0.5e - delta_L
   */
  static calculate(
    indication: number | string | Decimal,
    additionalLoadDeltaL: number | string | Decimal,
    e: number | string | Decimal
  ): ChangeoverPointResult {
    const I = DecimalUtils.from(indication);
    const deltaL = DecimalUtils.from(additionalLoadDeltaL);
    const eDec = DecimalUtils.from(e);

    const halfE = DecimalUtils.mul(eDec, '0.5');
    const calculatedP = DecimalUtils.sub(DecimalUtils.add(I, halfE), deltaL);

    return {
      indicatedValue: I,
      additionalLoad: deltaL,
      scaleIntervalE: eDec,
      calculatedP,
      formula: 'P = I + 0.5e - delta_L'
    };
  }
}
