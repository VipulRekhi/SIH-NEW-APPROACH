import { AccuracyClass, RegulatoryMode } from './calculation.types.js';
import { OIML_R76_TABLE_6_ZONES } from './mpe.rules.js';
import { DecimalUtils, Decimal } from './decimal.utils.js';
import {
  InstrumentApplicabilityContext,
  ApplicabilityEvaluationResult,
  TestApplicabilityStatus,
  TestImplementationState,
  TestExecutionStatus,
  TestResultStatus,
  InstrumentConfiguration
} from './applicability.types.js';
import { ApplicabilityRules } from './applicability.rules.js';

export * from './applicability.types.js';
export { ApplicabilityRules };

export interface RecommendedLoadPoint {
  stepNumber: number;
  direction: 'LOADING' | 'UNLOADING';
  loadValue: number;
  unit: string;
  rationale: string;
}

export class ApplicabilityService {
  /**
   * Generates Recommended Test Points for Weighing Performance.
   * Derived from: Min, Max, e, accuracy class Table 6 MPE transition points, and regulatory mode.
   * Explicitly labeled as "Recommended test points", fully editable by technician.
   */
  static generateRecommendedLoadPlan(
    minCapacity: number,
    maxCapacity: number,
    e: number,
    accuracyClass: AccuracyClass,
    unit: string,
    regulatoryMode: RegulatoryMode = 'TYPE_EVALUATION'
  ): RecommendedLoadPoint[] {
    const minDec = DecimalUtils.from(minCapacity);
    const maxDec = DecimalUtils.from(maxCapacity);
    const eDec = DecimalUtils.from(e);

    const zones = OIML_R76_TABLE_6_ZONES[accuracyClass] || [];
    const pointsSet = new Set<string>();

    // 1. Minimum capacity (Min)
    pointsSet.add(DecimalUtils.format(minDec, 4));

    // 2. MPE transition points (load = m * e) that fall between Min and Max
    for (const zone of zones) {
      if (zone.maxM) {
        const transLoad = DecimalUtils.mul(zone.maxM, eDec);
        if (DecimalUtils.gt(transLoad, minDec) && DecimalUtils.lt(transLoad, maxDec)) {
          // Point at transition
          pointsSet.add(DecimalUtils.format(transLoad, 4));
        }
      }
    }

    // 3. Representative loads: ~25% Max, ~50% Max, ~75% Max
    const quarter = DecimalUtils.mul(maxDec, '0.25');
    const half = DecimalUtils.mul(maxDec, '0.50');
    const threeQuarter = DecimalUtils.mul(maxDec, '0.75');

    if (DecimalUtils.gt(quarter, minDec) && DecimalUtils.lt(quarter, maxDec)) {
      pointsSet.add(DecimalUtils.format(quarter, 4));
    }
    if (DecimalUtils.gt(half, minDec) && DecimalUtils.lt(half, maxDec)) {
      pointsSet.add(DecimalUtils.format(half, 4));
    }
    if (DecimalUtils.gt(threeQuarter, minDec) && DecimalUtils.lt(threeQuarter, maxDec)) {
      pointsSet.add(DecimalUtils.format(threeQuarter, 4));
    }

    // 4. Maximum capacity (Max)
    pointsSet.add(DecimalUtils.format(maxDec, 4));

    // Sort loads ascending
    const ascendingLoads = Array.from(pointsSet)
      .map(s => parseFloat(s))
      .sort((a, b) => a - b);

    const plan: RecommendedLoadPoint[] = [];
    let step = 1;

    // Loading phase (increasing from Min to Max)
    for (const load of ascendingLoads) {
      let rationale = 'Operational test point';
      if (Math.abs(load - minCapacity) < 0.0001) rationale = 'Minimum Capacity (Min)';
      else if (Math.abs(load - maxCapacity) < 0.0001) rationale = 'Maximum Capacity (Max)';
      else if (Math.abs(load - (maxCapacity * 0.5)) < 0.0001) rationale = 'Approx. 50% Max (Middle capacity)';
      else rationale = 'MPE Zone Boundary / Capacity Fraction';

      plan.push({
        stepNumber: step++,
        direction: 'LOADING',
        loadValue: load,
        unit,
        rationale
      });
    }

    // Unloading phase (decreasing from Max back to Min)
    const descendingLoads = [...ascendingLoads].reverse();
    for (const load of descendingLoads) {
      plan.push({
        stepNumber: step++,
        direction: 'UNLOADING',
        loadValue: load,
        unit,
        rationale: load === minCapacity ? 'Return to Min' : 'Decreasing Load Verification'
      });
    }

    return plan;
  }

  /**
   * Evaluates the applicability of a test type code given the instrument's features.
   * Deterministically returns APPLICABLE, NOT_APPLICABLE, or REVIEW_REQUIRED.
   */
  static evaluateTestApplicability(
    testCode: string,
    context: InstrumentApplicabilityContext
  ): ApplicabilityEvaluationResult {
    return ApplicabilityRules.evaluate(testCode, context);
  }
}
