import { ZeroSettingInput, ZeroSettingResult, RuleEvaluationResult } from './calculation.types.js';
import { ChangeoverCalculator } from './changeover.calculator.ts';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export class ZeroCalculator {
  static calculate(input: ZeroSettingInput): ZeroSettingResult {
    const eDec = DecimalUtils.from(input.e);
    const dDec = DecimalUtils.from(input.d);
    const finalIndDec = DecimalUtils.from(input.finalIndication);

    // Permissible zero error limit: 0.25e (Clause 4.5.2)
    const maxPermissibleZeroError = DecimalUtils.mul(eDec, '0.25');

    let zeroErrorE0: Decimal;
    let isEvaluatedAlgorithmically = false;

    if (input.additionalLoadAtZero !== undefined && input.additionalLoadAtZero !== null) {
      // Clause A.4.2.3: Zero error determined via changeover weights
      // P0 = I0 + 0.5e - delta_L0
      // E0 = P0 - 0 = P0
      const co = ChangeoverCalculator.calculate(finalIndDec, input.additionalLoadAtZero, eDec);
      zeroErrorE0 = co.calculatedP;
      isEvaluatedAlgorithmically = true;
    } else {
      // Fallback: direct zero indication
      zeroErrorE0 = finalIndDec;
      isEvaluatedAlgorithmically = !finalIndDec.isZero(); // if not 0, can evaluate directly
    }

    const absZeroError = DecimalUtils.abs(zeroErrorE0);
    const passesTolerance = DecimalUtils.lte(absZeroError, maxPermissibleZeroError);

    // If qualitative without turning point, require technician review per prompt instructions
    const status = !isEvaluatedAlgorithmically
      ? 'REVIEW_REQUIRED'
      : passesTolerance
        ? 'PASS'
        : 'FAIL';

    const evaluation: RuleEvaluationResult = {
      ruleId: 'R76-4.5.2-A.4.2.3',
      regulation: 'OIML R 76-1',
      edition: '2006',
      clause: '4.5.2',
      annexClause: 'A.4.2.3',
      inputs: {
        initialIndication: input.initialIndication,
        zeroSettingAction: input.zeroSettingAction,
        finalIndication: input.finalIndication,
        additionalLoadAtZero: input.additionalLoadAtZero ?? null,
        e: DecimalUtils.toNumber(eDec),
        d: DecimalUtils.toNumber(dDec),
        unit: input.unit,
        remarks: input.remarks || null
      },
      intermediateValues: {
        zeroErrorE0: DecimalUtils.toNumber(zeroErrorE0),
        absZeroError: DecimalUtils.toNumber(absZeroError),
        maxPermissibleZeroError: DecimalUtils.toNumber(maxPermissibleZeroError)
      },
      formula: 'P0 = I0 + 0.5e - delta_L; E0 = P0; |E0| <= 0.25e',
      limit: {
        maxPermissible: DecimalUtils.toNumber(maxPermissibleZeroError),
        unit: input.unit
      },
      result: {
        zeroErrorE0: DecimalUtils.toNumber(zeroErrorE0),
        passesTolerance
      },
      status,
      explanation: status === 'REVIEW_REQUIRED'
        ? 'Zero-setting behavior recorded. Quantitative changeover verification requires technician review.'
        : passesTolerance
          ? `Zero-setting error E0 = ${DecimalUtils.format(zeroErrorE0, 4)} ${input.unit} does not exceed permissible limit +/-0.25e (+/-${DecimalUtils.format(maxPermissibleZeroError, 4)} ${input.unit}).`
          : `Zero-setting error E0 = ${DecimalUtils.format(zeroErrorE0, 4)} ${input.unit} exceeds permissible limit +/-0.25e (+/-${DecimalUtils.format(maxPermissibleZeroError, 4)} ${input.unit}).`
    };

    return {
      initialIndication: input.initialIndication,
      finalIndication: input.finalIndication,
      zeroErrorE0: DecimalUtils.toNumber(zeroErrorE0),
      unit: input.unit,
      maxPermissibleZeroError: DecimalUtils.toNumber(maxPermissibleZeroError),
      status,
      evaluation
    };
  }
}
