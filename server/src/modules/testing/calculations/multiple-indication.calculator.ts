import { RuleEvaluationResult, TestComplianceStatus } from './calculation.types.js';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export interface MultipleIndicationsInput {
  load: number;
  unit: string;
  indications: { deviceName: string; isPrinter: boolean; indicationValue: number }[];
  mpeAbsolute: number;
}

export class MultipleIndicationCalculator {
  /**
   * OIML R 76-1:2006 Clause 3.6.3:
   * 1. Difference between indications on different devices <= |MPE|
   * 2. Difference between digital display and printer = 0
   */
  static calculate(input: MultipleIndicationsInput): {
    status: TestComplianceStatus;
    maxDifference: number;
    printerMatchesDisplay: boolean;
    evaluation: RuleEvaluationResult;
  } {
    const mpeLimitDec = DecimalUtils.from(input.mpeAbsolute);
    const devices = input.indications;

    let maxDiffDec = DecimalUtils.from(0);
    let printerMatches = true;

    for (let i = 0; i < devices.length; i++) {
      for (let j = i + 1; j < devices.length; j++) {
        const diff = DecimalUtils.abs(DecimalUtils.sub(devices[i].indicationValue, devices[j].indicationValue));
        if (DecimalUtils.gt(diff, maxDiffDec)) {
          maxDiffDec = diff;
        }

        // If one is printer and one is digital display
        if (devices[i].isPrinter !== devices[j].isPrinter) {
          if (!diff.isZero()) {
            printerMatches = false;
          }
        }
      }
    }

    const passesMpe = DecimalUtils.lte(maxDiffDec, mpeLimitDec);
    const isPass = passesMpe && printerMatches;
    const status: TestComplianceStatus = isPass ? 'PASS' : 'FAIL';

    const evaluation: RuleEvaluationResult = {
      ruleId: 'R76-3.6.3',
      regulation: 'OIML R 76-1',
      edition: '2006',
      clause: '3.6.3',
      inputs: {
        load: input.load,
        unit: input.unit,
        devices: input.indications,
        mpeAbsolute: input.mpeAbsolute
      },
      intermediateValues: {
        maxDifference: DecimalUtils.toNumber(maxDiffDec),
        printerMatchesDisplay: printerMatches
      },
      formula: 'Diff(devices) <= |MPE|; Diff(display, printer) == 0',
      limit: {
        maxDiff: input.mpeAbsolute,
        unit: input.unit
      },
      result: {
        maxDifference: DecimalUtils.toNumber(maxDiffDec),
        printerMatchesDisplay: printerMatches
      },
      status,
      explanation: isPass
        ? `Indications across ${devices.length} devices match within MPE (max difference = ${DecimalUtils.format(maxDiffDec, 4)} ${input.unit}) and printer outputs match display.`
        : !printerMatches
          ? `Discrepancy detected between digital display and physical printer output (Clause 3.6.3 requires exact zero difference).`
          : `Difference between devices (${DecimalUtils.format(maxDiffDec, 4)} ${input.unit}) exceeds permissible MPE limit (${DecimalUtils.format(mpeLimitDec, 4)} ${input.unit}).`
    };

    return {
      status,
      maxDifference: DecimalUtils.toNumber(maxDiffDec),
      printerMatchesDisplay: printerMatches,
      evaluation
    };
  }
}
