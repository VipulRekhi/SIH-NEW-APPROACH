import { RuleEvaluationResult, TestComplianceStatus } from './calculation.types.js';
import { MpeCalculator } from './mpe.calculator.ts';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export interface TareTestInput {
  tareValue: number;
  netLoad: number;
  netIndication: number;
  unit: string;
  e: number;
  accuracyClass: any;
  regulatoryMode: any;
}

export class TareCalculator {
  /**
   * OIML R 76-1:2006 Clause 4.6.1 & A.4.6: Tare Balancing and Tare Weighing.
   * State: PARTIAL -> Enforces REVIEW_REQUIRED so unverified automation never yields fake PASS.
   */
  static calculate(input: TareTestInput): {
    tareValue: number;
    netLoad: number;
    netIndication: number;
    netError: number;
    mpeAbsolute: number;
    status: TestComplianceStatus;
    evaluation: RuleEvaluationResult;
  } {
    const netLoadDec = DecimalUtils.from(input.netLoad);
    const netIndDec = DecimalUtils.from(input.netIndication);
    const eDec = DecimalUtils.from(input.e);

    const mpe = MpeCalculator.calculate(netLoadDec, eDec, input.accuracyClass, input.regulatoryMode);
    const mpeDec = DecimalUtils.from(mpe.mpeAbsolute);

    const netError = DecimalUtils.sub(netIndDec, netLoadDec);
    const absNetError = DecimalUtils.abs(netError);
    const passesMpe = DecimalUtils.lte(absNetError, mpeDec);

    // Enforcement: Tare module has PARTIAL implementation status -> must be REVIEW_REQUIRED
    const status: TestComplianceStatus = 'REVIEW_REQUIRED';

    const evaluation: RuleEvaluationResult = {
      ruleId: 'R76-4.6.1',
      regulation: 'OIML R 76-1',
      edition: '2006',
      clause: '4.6.1',
      annexClause: 'A.4.6',
      inputs: {
        tareValue: input.tareValue,
        netLoad: input.netLoad,
        netIndication: input.netIndication,
        unit: input.unit,
        e: input.e,
        accuracyClass: input.accuracyClass,
        regulatoryMode: input.regulatoryMode
      },
      intermediateValues: {
        netError: DecimalUtils.toNumber(netError),
        absNetError: DecimalUtils.toNumber(absNetError),
        mpeAbsolute: mpe.mpeAbsolute,
        passesTolerance: passesMpe
      },
      formula: 'E_net = I_net - L_net; |E_net| <= |MPE(L_net)|',
      limit: {
        mpeAbsolute: mpe.mpeAbsolute,
        unit: input.unit
      },
      result: {
        netError: DecimalUtils.toNumber(netError),
        passesTolerance: passesMpe,
        implementationState: 'PARTIAL'
      },
      status,
      explanation: `Tare weighing observation recorded (Net error = ${DecimalUtils.format(netError, 4)} ${input.unit}, MPE = +/-${DecimalUtils.format(mpeDec, 4)} ${input.unit}). Tare verification module is marked PARTIAL; manual technician review required.`
    };

    return {
      tareValue: input.tareValue,
      netLoad: input.netLoad,
      netIndication: input.netIndication,
      netError: DecimalUtils.toNumber(netError),
      mpeAbsolute: mpe.mpeAbsolute,
      status,
      evaluation
    };
  }
}
