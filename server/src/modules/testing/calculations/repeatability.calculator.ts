import { RepeatabilityInput, RepeatabilityResult, RuleEvaluationResult } from './calculation.types.js';
import { MpeCalculator } from './mpe.calculator.ts';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export class RepeatabilityCalculator {
  static getRequiredReadingsCount(
    regulatoryMode: string,
    accuracyClass: string,
    maxCapacity: number
  ): number {
    if (regulatoryMode === 'TYPE_EVALUATION') {
      // Clause A.4.10: For Max < 1000 kg, each series shall consist of 10 weighings.
      // For Max >= 1000 kg, at least 3 weighings.
      return maxCapacity < 1000 ? 10 : 3;
    } else {
      // Verification mode (Clause A.4.4 / verification testing)
      if (accuracyClass === 'I' || accuracyClass === 'II') {
        return 6;
      }
      return 3;
    }
  }

  static calculate(input: RepeatabilityInput): RepeatabilityResult {
    if (!input.readings || input.readings.length === 0) {
      throw new Error('Repeatability test requires at least one observation reading.');
    }

    const requiredCount = this.getRequiredReadingsCount(
      input.regulatoryMode,
      input.accuracyClass,
      input.maxCapacity
    );

    const loadDec = DecimalUtils.from(input.load);
    const eDec = DecimalUtils.from(input.e);

    // MPE for this load
    const mpeResult = MpeCalculator.calculate(
      loadDec,
      eDec,
      input.accuracyClass,
      input.regulatoryMode
    );
    const mpeLimitDec = DecimalUtils.from(mpeResult.mpeAbsolute);

    // Compute I_max, I_min, and range Delta_I
    let maxDec = DecimalUtils.from(input.readings[0]);
    let minDec = DecimalUtils.from(input.readings[0]);

    for (const val of input.readings) {
      const dVal = DecimalUtils.from(val);
      if (DecimalUtils.gt(dVal, maxDec)) maxDec = dVal;
      if (DecimalUtils.lt(dVal, minDec)) minDec = dVal;
    }

    const rangeDiffDec = DecimalUtils.sub(maxDec, minDec);
    const passesTolerance = DecimalUtils.lte(rangeDiffDec, mpeLimitDec);

    // If fewer readings than mandated by R-76, must flag REVIEW_REQUIRED rather than unconditional PASS
    const hasSufficientReadings = input.readings.length >= requiredCount;
    const finalStatus = !hasSufficientReadings
      ? 'REVIEW_REQUIRED'
      : passesTolerance
        ? 'PASS'
        : 'FAIL';

    const evaluation: RuleEvaluationResult = {
      ruleId: 'R76-3.6.1-A.4.10',
      regulation: 'OIML R 76-1',
      edition: '2006',
      clause: '3.6.1',
      annexClause: 'A.4.10',
      inputs: {
        load: DecimalUtils.toNumber(loadDec),
        readingsCount: input.readings.length,
        requiredReadingsCount: requiredCount,
        readings: input.readings,
        unit: input.unit,
        accuracyClass: input.accuracyClass,
        regulatoryMode: input.regulatoryMode,
        maxCapacity: input.maxCapacity
      },
      intermediateValues: {
        maxIndication: DecimalUtils.toNumber(maxDec),
        minIndication: DecimalUtils.toNumber(minDec),
        rangeDifference: DecimalUtils.toNumber(rangeDiffDec),
        mpeAbsolute: mpeResult.mpeAbsolute
      },
      formula: 'Delta_I = I_max - I_min <= |MPE(load)|',
      limit: {
        mpeAbsolute: mpeResult.mpeAbsolute,
        unit: input.unit
      },
      result: {
        rangeDifference: DecimalUtils.toNumber(rangeDiffDec),
        passesTolerance,
        hasSufficientReadings
      },
      status: finalStatus,
      explanation: !hasSufficientReadings
        ? `Readings count (${input.readings.length}) is below OIML R-76 mandated count of ${requiredCount} for ${input.regulatoryMode} (Max = ${input.maxCapacity} ${input.unit}). Review required.`
        : passesTolerance
          ? `Difference between repeated weighings Delta_I = ${DecimalUtils.format(rangeDiffDec, 4)} ${input.unit} does not exceed applicable MPE = ${DecimalUtils.format(mpeLimitDec, 4)} ${input.unit}.`
          : `Difference between repeated weighings Delta_I = ${DecimalUtils.format(rangeDiffDec, 4)} ${input.unit} exceeds applicable MPE = ${DecimalUtils.format(mpeLimitDec, 4)} ${input.unit}.`
    };

    return {
      load: DecimalUtils.toNumber(loadDec),
      unit: input.unit,
      readings: input.readings,
      maxIndication: DecimalUtils.toNumber(maxDec),
      minIndication: DecimalUtils.toNumber(minDec),
      rangeDifference: DecimalUtils.toNumber(rangeDiffDec),
      mpe: mpeResult,
      status: finalStatus,
      requiredReadingsCount: requiredCount,
      providedReadingsCount: input.readings.length,
      readingsCount: input.readings.length,
      evaluation
    };
  }
}
