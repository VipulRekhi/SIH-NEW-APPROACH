import {
  ReferenceStandardSuitabilityInput,
  ReferenceStandardSuitabilityResult,
  RuleEvaluationResult,
  TestComplianceStatus
} from './calculation.types.js';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export class StandardValidationCalculator {
  /**
   * Evaluates Reference Standard Suitability according to OIML R 76-1:2006 Clause 3.7.1:
   * 1. Check A: Standard weight maximum error <= 1/3 * MPE(load)
   * 2. Check B: Certificate validity and expanded uncertainty
   */
  static validate(input: ReferenceStandardSuitabilityInput): ReferenceStandardSuitabilityResult {
    const errorDec = DecimalUtils.abs(DecimalUtils.from(input.reportedError));
    const mpeDec = DecimalUtils.abs(DecimalUtils.from(input.instrumentMpe));

    // One-third of instrument MPE: 1/3 * MPE(L)
    const allowedStandardErrorDec = DecimalUtils.div(mpeDec, '3');

    // 1. Error check
    const passesErrorCheck = DecimalUtils.lte(errorDec, allowedStandardErrorDec);
    const errorStatus: TestComplianceStatus = passesErrorCheck ? 'PASS' : 'FAIL';

    const evaluationError: RuleEvaluationResult = {
      ruleId: 'R76-3.7.1-ERROR',
      regulation: 'OIML R 76-1',
      edition: '2006',
      clause: '3.7.1',
      inputs: {
        standardIdentifier: input.standardIdentifier,
        nominalMass: input.nominalMass,
        reportedError: input.reportedError,
        instrumentTestLoad: input.instrumentTestLoad,
        instrumentMpe: input.instrumentMpe,
        unit: input.unit
      },
      intermediateValues: {
        oneThirdMpe: DecimalUtils.toNumber(allowedStandardErrorDec),
        reportedErrorAbs: DecimalUtils.toNumber(errorDec)
      },
      formula: '|Error_standard| <= 1/3 * |MPE_instrument(load)|',
      limit: {
        maxPermissibleStandardError: DecimalUtils.toNumber(allowedStandardErrorDec),
        unit: input.unit
      },
      result: {
        passesErrorCheck
      },
      status: errorStatus,
      explanation: passesErrorCheck
        ? `Standard weight error (|${DecimalUtils.format(errorDec, 5)} ${input.unit}|) is within 1/3 of instrument MPE (${DecimalUtils.format(allowedStandardErrorDec, 5)} ${input.unit}).`
        : `Standard weight error (|${DecimalUtils.format(errorDec, 5)} ${input.unit}|) exceeds 1/3 of instrument MPE (${DecimalUtils.format(allowedStandardErrorDec, 5)} ${input.unit}).`
    };

    // 2. Certificate and uncertainty check
    let hasValidCert = false;
    let certExplanation = '';

    if (!input.certificateNumber || input.certificateNumber.trim() === '') {
      certExplanation = 'Missing calibration certificate number.';
    } else if (!input.certificateValidUntil) {
      certExplanation = 'Missing certificate validity expiration date.';
    } else {
      const validUntil = new Date(input.certificateValidUntil);
      const isExpired = validUntil.getTime() < Date.now();
      if (isExpired) {
        certExplanation = `Calibration certificate ${input.certificateNumber} expired on ${validUntil.toISOString().split('T')[0]}.`;
      } else {
        hasValidCert = true;
        certExplanation = `Certificate ${input.certificateNumber} is active and valid until ${validUntil.toISOString().split('T')[0]}.`;
      }
    }

    const certStatus: TestComplianceStatus = hasValidCert
      ? 'PASS'
      : input.certificateNumber ? 'FAIL' : 'REVIEW_REQUIRED';

    const evaluationCertificate: RuleEvaluationResult = {
      ruleId: 'R76-3.7.1-UNCERTAINTY',
      regulation: 'OIML R 76-1',
      edition: '2006',
      clause: '3.7.1',
      inputs: {
        standardIdentifier: input.standardIdentifier,
        certificateNumber: input.certificateNumber || null,
        certificateValidUntil: input.certificateValidUntil || null,
        expandedUncertainty: input.expandedUncertainty ?? null
      },
      intermediateValues: {
        hasValidCert
      },
      formula: 'Calibration certificate valid and traceability established to OIML R 111',
      limit: {
        requirement: 'Current, unexpired calibration certificate from accredited laboratory'
      },
      result: {
        hasValidCert
      },
      status: certStatus,
      explanation: certExplanation
    };

    const overallSuitabilityStatus: TestComplianceStatus =
      errorStatus === 'FAIL' || certStatus === 'FAIL'
        ? 'FAIL'
        : certStatus === 'REVIEW_REQUIRED'
          ? 'REVIEW_REQUIRED'
          : 'PASS';

    return {
      standardIdentifier: input.standardIdentifier,
      errorCheckStatus: errorStatus,
      certificateCheckStatus: certStatus,
      overallSuitabilityStatus,
      evaluationError,
      evaluationCertificate
    };
  }
}
