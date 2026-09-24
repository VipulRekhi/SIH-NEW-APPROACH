import { IndicationErrorInput, IndicationErrorResult, RuleEvaluationResult } from './calculation.types.js';
import { MpeCalculator } from './mpe.calculator.ts';
import { ChangeoverCalculator } from './changeover.calculator.ts';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export class ErrorCalculator {
  static calculate(input: IndicationErrorInput): IndicationErrorResult {
    const loadDec = DecimalUtils.from(input.load);
    const indDec = DecimalUtils.from(input.indication);
    const eDec = DecimalUtils.from(input.e);
    const dDec = DecimalUtils.from(input.d);
    const zeroErrorDec = DecimalUtils.from(input.zeroError || 0);

    // Calculate applicable MPE for this load
    const mpeResult = MpeCalculator.calculate(
      loadDec,
      eDec,
      input.accuracyClass,
      input.regulatoryMode
    );
    const mpeLimitDec = DecimalUtils.from(mpeResult.mpeAbsolute);

    // Check if finer digital indication is available (d <= 0.2e)
    const isHighResolution = DecimalUtils.lte(dDec, DecimalUtils.mul(eDec, '0.2'));

    let turningPointP: Decimal | null = null;
    let rawErrorE: Decimal;
    let methodUsed: 'HIGH_RESOLUTION_DISPLAY' | 'CHANGEOVER_POINT_METHOD' | 'DIRECT_INDICATION';

    if (input.additionalLoad !== undefined && input.additionalLoad !== null) {
      // Case B: Changeover-point method (OIML R 76-1:2006 Clause A.4.4.3)
      const changeover = ChangeoverCalculator.calculate(indDec, input.additionalLoad, eDec);
      turningPointP = changeover.calculatedP;
      rawErrorE = DecimalUtils.sub(turningPointP, loadDec);
      methodUsed = 'CHANGEOVER_POINT_METHOD';
    } else if (isHighResolution) {
      // Case A: Finer digital indication available (Clause A.4.4.3)
      rawErrorE = DecimalUtils.sub(indDec, loadDec);
      methodUsed = 'HIGH_RESOLUTION_DISPLAY';
    } else {
      // Direct indication fallback (rounded reading)
      rawErrorE = DecimalUtils.sub(indDec, loadDec);
      methodUsed = 'DIRECT_INDICATION';
    }

    // Corrected error: Ec = E - E0
    const correctedErrorEc = DecimalUtils.sub(rawErrorE, zeroErrorDec);
    const absErrorDec = DecimalUtils.abs(correctedErrorEc);

    // Check compliance: |Ec| <= MPE
    const isPass = DecimalUtils.lte(absErrorDec, mpeLimitDec);
    const marginDec = DecimalUtils.sub(mpeLimitDec, absErrorDec);

    const evaluation: RuleEvaluationResult = {
      ruleId: 'R76-A.4.4.3',
      regulation: 'OIML R 76-1',
      edition: '2006',
      clause: '3.5.1',
      annexClause: 'A.4.4.3',
      inputs: {
        load: DecimalUtils.toNumber(loadDec),
        indication: DecimalUtils.toNumber(indDec),
        additionalLoad: input.additionalLoad ?? null,
        zeroErrorE0: DecimalUtils.toNumber(zeroErrorDec),
        e: DecimalUtils.toNumber(eDec),
        d: DecimalUtils.toNumber(dDec),
        unit: input.unit,
        accuracyClass: input.accuracyClass,
        regulatoryMode: input.regulatoryMode
      },
      intermediateValues: {
        methodUsed,
        turningPointP: turningPointP ? DecimalUtils.toNumber(turningPointP) : null,
        rawErrorE: DecimalUtils.toNumber(rawErrorE),
        zeroErrorE0: DecimalUtils.toNumber(zeroErrorDec),
        correctedErrorEc: DecimalUtils.toNumber(correctedErrorEc),
        m: mpeResult.m,
        zone: mpeResult.zone,
        factorE: mpeResult.factorE
      },
      formula: turningPointP
        ? 'P = I + 0.5e - delta_L; E = P - L; Ec = E - E0; |Ec| <= MPE'
        : 'E = I - L; Ec = E - E0; |Ec| <= MPE',
      limit: {
        mpeAbsolute: mpeResult.mpeAbsolute,
        mpeLower: mpeResult.mpeSignedLower,
        mpeUpper: mpeResult.mpeSignedUpper,
        unit: input.unit
      },
      result: {
        correctedError: DecimalUtils.toNumber(correctedErrorEc),
        absoluteError: DecimalUtils.toNumber(absErrorDec),
        margin: DecimalUtils.toNumber(marginDec),
        isPass
      },
      status: isPass ? 'PASS' : 'FAIL',
      explanation: isPass
        ? `Observed corrected error Ec = ${DecimalUtils.format(correctedErrorEc, 4)} ${input.unit} is within permissible limit MPE = +/-${DecimalUtils.format(mpeLimitDec, 4)} ${input.unit} (Margin: ${DecimalUtils.format(marginDec, 4)} ${input.unit}).`
        : `Observed corrected error Ec = ${DecimalUtils.format(correctedErrorEc, 4)} ${input.unit} exceeds permissible limit MPE = +/-${DecimalUtils.format(mpeLimitDec, 4)} ${input.unit} by ${DecimalUtils.format(DecimalUtils.abs(marginDec), 4)} ${input.unit}.`
    };

    return {
      load: DecimalUtils.toNumber(loadDec),
      indication: DecimalUtils.toNumber(indDec),
      unit: input.unit,
      turningPointP: turningPointP ? DecimalUtils.toNumber(turningPointP) : null,
      rawErrorE: DecimalUtils.toNumber(rawErrorE),
      zeroErrorE0: DecimalUtils.toNumber(zeroErrorDec),
      correctedErrorEc: DecimalUtils.toNumber(correctedErrorEc),
      mpe: mpeResult,
      absoluteError: DecimalUtils.toNumber(absErrorDec),
      margin: DecimalUtils.toNumber(marginDec),
      status: isPass ? 'PASS' : 'FAIL',
      methodUsed,
      evaluation
    };
  }
}
