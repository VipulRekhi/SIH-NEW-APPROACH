import {
  EccentricityInput,
  EccentricityResult,
  EccentricityPositionResult,
  EccentricSupportCase,
  RuleEvaluationResult
} from './calculation.types.js';
import { MpeCalculator } from './mpe.calculator.ts';
import { ChangeoverCalculator } from './changeover.calculator.ts';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export class EccentricityCalculator {
  /**
   * Calculates the exact test load based on the instrument receptor configuration:
   * 1. <= 4 supports: 1/3 * (Max + Additive_Tare) (Clause 3.6.2.1)
   * 2. > 4 supports: 1/(n-1) * (Max + Additive_Tare) (Clause 3.6.2.2)
   * 3. Tanks / hoppers: 1/10 * (Max + Additive_Tare) (Clause 3.6.2.3)
   * 4. Rolling load: heaviest concentrated rolling load, not exceeding 0.8 * (Max + Additive_Tare) (Clause 3.6.2.4)
   */
  static calculateTestLoad(
    supportCase: EccentricSupportCase,
    maxCapacity: number | string | Decimal,
    maxAdditiveTare: number | string | Decimal = 0,
    supportPointCount: number = 4,
    rollingLoadWeight?: number
  ): { testLoad: Decimal; formula: string; ruleId: string; clause: string } {
    const maxDec = DecimalUtils.from(maxCapacity);
    const tareDec = DecimalUtils.from(maxAdditiveTare);
    const combinedCapacity = DecimalUtils.add(maxDec, tareDec);

    switch (supportCase) {
      case 'MORE_THAN_4_SUPPORTS': {
        const n = Math.max(5, supportPointCount);
        const divisor = DecimalUtils.from(n - 1);
        const load = DecimalUtils.div(combinedCapacity, divisor);
        return {
          testLoad: DecimalUtils.round(load, 4),
          formula: `1/(${n} - 1) * (Max + Tare) = 1/${n - 1} * (${combinedCapacity.toString()})`,
          ruleId: 'R76-3.6.2.2',
          clause: '3.6.2.2'
        };
      }
      case 'SPECIAL_MINIMAL_OFF_CENTRE': {
        const load = DecimalUtils.mul(combinedCapacity, '0.1');
        return {
          testLoad: DecimalUtils.round(load, 4),
          formula: `1/10 * (Max + Tare) = 1/10 * (${combinedCapacity.toString()})`,
          ruleId: 'R76-3.6.2.3',
          clause: '3.6.2.3'
        };
      }
      case 'ROLLING_LOAD': {
        const maxAllowed = DecimalUtils.mul(combinedCapacity, '0.8');
        const rolling = rollingLoadWeight ? DecimalUtils.from(rollingLoadWeight) : maxAllowed;
        const finalLoad = DecimalUtils.lte(rolling, maxAllowed) ? rolling : maxAllowed;
        return {
          testLoad: DecimalUtils.round(finalLoad, 4),
          formula: `min(rolling_load, 0.8 * (Max + Tare)) = min(${rolling.toString()}, ${maxAllowed.toString()})`,
          ruleId: 'R76-3.6.2.4',
          clause: '3.6.2.4'
        };
      }
      case 'LESS_OR_EQUAL_4_SUPPORTS':
      default: {
        const load = DecimalUtils.div(combinedCapacity, 3);
        return {
          testLoad: DecimalUtils.round(load, 4),
          formula: `1/3 * (Max + Tare) = 1/3 * (${combinedCapacity.toString()})`,
          ruleId: 'R76-3.6.2.1-A.4.7',
          clause: '3.6.2.1'
        };
      }
    }
  }

  static calculate(input: EccentricityInput): EccentricityResult {
    const supportCase: EccentricSupportCase = input.supportCase || 'LESS_OR_EQUAL_4_SUPPORTS';
    const { testLoad, formula, ruleId, clause } = this.calculateTestLoad(
      supportCase,
      input.maxCapacity,
      input.maxAdditiveTare || 0,
      input.supportPointCount || 4,
      input.rollingLoadWeight
    );

    const eDec = DecimalUtils.from(input.e);
    const mpeResult = MpeCalculator.calculate(
      testLoad,
      eDec,
      input.accuracyClass,
      input.regulatoryMode
    );
    const mpeLimitDec = DecimalUtils.from(mpeResult.mpeAbsolute);

    const positionResults: EccentricityPositionResult[] = [];
    let allPositionsPass = true;

    for (const reading of input.readings) {
      const posLoadDec = DecimalUtils.from(reading.load || testLoad);
      const posIndDec = DecimalUtils.from(reading.indication);
      const posZeroDec = DecimalUtils.from(reading.zeroError || 0);

      let rawErrorE: Decimal;
      if (reading.additionalLoad !== undefined && reading.additionalLoad !== null) {
        const co = ChangeoverCalculator.calculate(posIndDec, reading.additionalLoad, eDec);
        rawErrorE = DecimalUtils.sub(co.calculatedP, posLoadDec);
      } else {
        rawErrorE = DecimalUtils.sub(posIndDec, posLoadDec);
      }

      const correctedErrorEc = DecimalUtils.sub(rawErrorE, posZeroDec);
      const absError = DecimalUtils.abs(correctedErrorEc);
      const isPass = DecimalUtils.lte(absError, mpeLimitDec);

      if (!isPass) {
        allPositionsPass = false;
      }

      positionResults.push({
        position: reading.position,
        load: DecimalUtils.toNumber(posLoadDec),
        indication: DecimalUtils.toNumber(posIndDec),
        rawError: DecimalUtils.toNumber(rawErrorE),
        zeroError: DecimalUtils.toNumber(posZeroDec),
        correctedError: DecimalUtils.toNumber(correctedErrorEc),
        mpe: mpeResult,
        status: isPass ? 'PASS' : 'FAIL'
      });
    }

    const standardRequiredPositions = ['CENTER', 'FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT'];
    const recordedPositions = input.readings.map(r => r.position);
    const uniquePositions = new Set(recordedPositions);
    const hasDuplicates = recordedPositions.length !== uniquePositions.size;

    // Check required positions for standard <=4 supports platform
    let isComplete = true;
    let missingPositions: string[] = [];
    if (supportCase === 'LESS_OR_EQUAL_4_SUPPORTS') {
      missingPositions = standardRequiredPositions.filter(p => !uniquePositions.has(p));
      if (missingPositions.length > 0) {
        isComplete = false;
      }
    } else {
      isComplete = input.readings.length >= 3;
    }

    let finalStatus: TestComplianceStatus;
    if (input.readings.length === 0) {
      finalStatus = 'INCOMPLETE';
    } else if (hasDuplicates) {
      finalStatus = 'REVIEW_REQUIRED';
    } else if (!allPositionsPass) {
      finalStatus = 'FAIL';
    } else if (!isComplete) {
      finalStatus = 'REVIEW_REQUIRED';
    } else {
      finalStatus = 'PASS';
    }

    const evaluation: RuleEvaluationResult = {
      ruleId,
      regulation: 'OIML R 76-1',
      edition: '2006',
      clause,
      annexClause: 'A.4.7',
      inputs: {
        supportCase,
        maxCapacity: input.maxCapacity,
        maxAdditiveTare: input.maxAdditiveTare || 0,
        supportPointCount: input.supportPointCount || 4,
        calculatedTestLoad: DecimalUtils.toNumber(testLoad),
        positionsCount: input.readings.length,
        unit: input.unit,
        accuracyClass: input.accuracyClass,
        regulatoryMode: input.regulatoryMode
      },
      intermediateValues: {
        formula,
        mpeAbsolute: mpeResult.mpeAbsolute,
        positionResults: positionResults.map(p => ({
          pos: p.position,
          correctedError: p.correctedError,
          status: p.status
        }))
      },
      formula: `${formula}; |Ec(pos)| <= |MPE(load)| for all tested positions`,
      limit: {
        mpeAbsolute: mpeResult.mpeAbsolute,
        unit: input.unit
      },
      result: {
        allPositionsPass,
        positionsTested: positionResults.length
      },
      status: finalStatus,
      explanation: hasDuplicates
        ? `INVALID OBSERVATION: Duplicate eccentric positions detected (${recordedPositions.join(', ')}). Each position must be uniquely recorded.`
        : !isComplete
          ? `INCOMPLETE TEST: ${positionResults.length} of 5 required positions recorded (Missing: ${missingPositions.join(', ')}). All 5 quadrant positions must be tested per Clause 3.6.2.1.`
          : allPositionsPass
            ? `All ${positionResults.length} eccentric positions satisfy permissible error limit MPE = +/-${DecimalUtils.format(mpeLimitDec, 4)} ${input.unit} at test load ${DecimalUtils.format(testLoad, 4)} ${input.unit}.`
            : `One or more eccentric positions exceed the permissible error limit MPE = +/-${DecimalUtils.format(mpeLimitDec, 4)} ${input.unit}.`
    };

    return {
      supportCase,
      calculatedTestLoad: DecimalUtils.toNumber(testLoad),
      unit: input.unit,
      positions: positionResults,
      status: finalStatus,
      evaluation
    };
  }
}
