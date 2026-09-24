import { RuleEvaluationResult, TestComplianceStatus } from './calculation.types.js';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export interface EquilibriumInput {
  load: number;
  unit: string;
  indicationNormal: number;
  indicationExtended: number;
  mpeAbsolute: number;
}

export class EquilibriumCalculator {
  /**
   * OIML R 76-1:2006 Clause 3.6.4:
   * Difference between two results obtained for the same load in different positions
   * of the equilibrium-extending device shall not exceed |MPE|.
   */
  static calculate(input: EquilibriumInput): {
    difference: number;
    status: TestComplianceStatus;
    evaluation: RuleEvaluationResult;
  } {
    const norm = DecimalUtils.from(input.indicationNormal);
    const ext = DecimalUtils.from(input.indicationExtended);
    const mpe = DecimalUtils.from(input.mpeAbsolute);

    const diff = DecimalUtils.abs(DecimalUtils.sub(norm, ext));
    const isPass = DecimalUtils.lte(diff, mpe);
    const status: TestComplianceStatus = isPass ? 'PASS' : 'FAIL';

    const evaluation: RuleEvaluationResult = {
      ruleId: 'R76-3.6.4',
      regulation: 'OIML R 76-1',
      edition: '2006',
      clause: '3.6.4',
      inputs: {
        load: input.load,
        unit: input.unit,
        indicationNormal: input.indicationNormal,
        indicationExtended: input.indicationExtended,
        mpeAbsolute: input.mpeAbsolute
      },
      intermediateValues: {
        difference: DecimalUtils.toNumber(diff)
      },
      formula: '|Indication_normal - Indication_extended| <= |MPE|',
      limit: {
        mpeAbsolute: input.mpeAbsolute,
        unit: input.unit
      },
      result: {
        difference: DecimalUtils.toNumber(diff),
        isPass
      },
      status,
      explanation: isPass
        ? `Difference between equilibrium positions (${DecimalUtils.format(diff, 4)} ${input.unit}) is within MPE (+/-${DecimalUtils.format(mpe, 4)} ${input.unit}).`
        : `Difference between equilibrium positions (${DecimalUtils.format(diff, 4)} ${input.unit}) exceeds MPE (+/-${DecimalUtils.format(mpe, 4)} ${input.unit}).`
    };

    return {
      difference: DecimalUtils.toNumber(diff),
      status,
      evaluation
    };
  }
}
