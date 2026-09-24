import { AccuracyClass, MetrologicalValidationResult } from './calculation.types.js';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export interface InstrumentMetrologicalParams {
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  accuracyClass: string;
  maxCapacity: number;
  minCapacity: number;
  scaleInterval: number; // d
  verificationScaleInterval: number; // e
  unit: string;
}

export class ValidationService {
  /**
   * Validates instrument metrological parameters according to OIML R 76-1:2006 Clause 3.4 & 3.2.
   */
  static validateInstrumentParameters(params: InstrumentMetrologicalParams): MetrologicalValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const max = DecimalUtils.from(params.maxCapacity);
    const min = DecimalUtils.from(params.minCapacity);
    const d = DecimalUtils.from(params.scaleInterval);
    const e = DecimalUtils.from(params.verificationScaleInterval);
    const accClass = params.accuracyClass.trim().toUpperCase() as AccuracyClass;

    // 1. Capacity checks
    if (DecimalUtils.lte(max, 0)) {
      errors.push(`Maximum capacity (Max) must be strictly positive. Found: ${params.maxCapacity}`);
    }
    if (DecimalUtils.lt(min, 0)) {
      errors.push(`Minimum capacity (Min) cannot be negative. Found: ${params.minCapacity}`);
    }
    if (DecimalUtils.lte(max, min)) {
      errors.push(`Maximum capacity (${params.maxCapacity}) must be strictly greater than minimum capacity (${params.minCapacity}).`);
    }

    // 2. Interval checks
    if (DecimalUtils.lte(d, 0)) {
      errors.push(`Scale interval (d) must be strictly positive. Found: ${params.scaleInterval}`);
    }
    if (DecimalUtils.lte(e, 0)) {
      errors.push(`Verification scale interval (e) must be strictly positive. Found: ${params.verificationScaleInterval}`);
    }

    // 3. OIML R 76-1:2006 Clause 3.4.2: Relationship between d and e
    // "d < e <= 10d"
    // Exception: For Class I instruments with d < 1 mg, e = 1 mg is permitted without d < e <= 10d.
    const isClassI = accClass === 'I';
    const isDSubMilligram = DecimalUtils.lt(d, DecimalUtils.from('0.000001')); // < 1 mg in kg if unit is kg, or check normalized
    const isClassIException = isClassI && (isDSubMilligram || params.unit.toLowerCase() === 'mg' && DecimalUtils.lt(d, 1));

    if (!isClassIException) {
      if (DecimalUtils.gte(d, e)) {
        errors.push(`OIML R 76 Clause 3.4.2 violation: scale interval (d=${params.scaleInterval}) must be strictly less than verification scale interval (e=${params.verificationScaleInterval}) for instruments with d != e or supplementary indication.`);
      }
      const tenD = DecimalUtils.mul(d, 10);
      if (DecimalUtils.gt(e, tenD)) {
        errors.push(`OIML R 76 Clause 3.4.2 violation: verification scale interval (e=${params.verificationScaleInterval}) cannot exceed 10 * d (10 * ${params.scaleInterval} = ${tenD.toString()}).`);
      }
    } else {
      warnings.push(`OIML R 76 Clause 3.4.2 Exception applied: Class I instrument with d < 1 mg allows e = 1 mg.`);
    }

    // 4. Number of verification scale intervals: n = Max / e (Clause 3.2, Table 3)
    let n = 0;
    if (DecimalUtils.gt(e, 0) && DecimalUtils.gt(max, 0)) {
      const nDec = DecimalUtils.div(max, e);
      n = DecimalUtils.toNumber(nDec);

      switch (accClass) {
        case 'I':
          if (n < 50000) {
            warnings.push(`Class I instruments normally require n >= 50,000 (Calculated n = ${n}).`);
          }
          break;
        case 'II':
          if (n < 100 || n > 100000) {
            warnings.push(`Class II verification intervals normally range 100 <= n <= 100,000 (Calculated n = ${n}).`);
          }
          break;
        case 'III':
          if (n < 100 || n > 10000) {
            warnings.push(`Class III verification intervals normally range 100 <= n <= 10,000 (Calculated n = ${n}).`);
          }
          break;
        case 'IIII':
          if (n < 100 || n > 1000) {
            warnings.push(`Class IIII verification intervals normally range 100 <= n <= 1,000 (Calculated n = ${n}).`);
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      get verificationIntervals() {
        return n;
      }
    };
  }
}
