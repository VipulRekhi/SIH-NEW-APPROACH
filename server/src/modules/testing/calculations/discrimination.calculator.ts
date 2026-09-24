import { DiscriminationInput, DiscriminationResult, RuleEvaluationResult } from './calculation.types.js';
import { MpeCalculator } from './mpe.calculator.ts';
import { DecimalUtils, Decimal } from './decimal.utils.js';

export class DiscriminationCalculator {
  static getRequiredAddedLoad(
    indicationType: 'digital' | 'analog' | 'non_self',
    d: number | string | Decimal,
    e: number | string | Decimal,
    testLoad: number | string | Decimal,
    accuracyClass: any,
    regulatoryMode: any
  ): { addedLoad: Decimal; ruleId: string; clause: string; formula: string } {
    const dDec = DecimalUtils.from(d);

    if (indicationType === 'digital') {
      // Clause 3.8: for digital type examination with d >= 5mg: 1.4d
      const load = DecimalUtils.mul(dDec, '1.4');
      return {
        addedLoad: load,
        ruleId: 'R76-3.8-DIGITAL',
        clause: '3.8 (Digital)',
        formula: 'added_load = 1.4 * d'
      };
    } else if (indicationType === 'analog') {
      // Clause 3.8: analog: 1.0 * MPE, but not less than 1 mg
      const mpe = MpeCalculator.calculate(testLoad, e, accuracyClass, regulatoryMode);
      const mpeDec = DecimalUtils.from(mpe.mpeAbsolute);
      return {
        addedLoad: mpeDec,
        ruleId: 'R76-3.8-ANALOG',
        clause: '3.8 (Analog)',
        formula: 'added_load = 1.0 * |MPE| (min 1 mg)'
      };
    } else {
      // Non-self indicating: 0.4 * MPE, but not less than 1 mg
      const mpe = MpeCalculator.calculate(testLoad, e, accuracyClass, regulatoryMode);
      const load = DecimalUtils.mul(mpe.mpeAbsolute, '0.4');
      return {
        addedLoad: load,
        ruleId: 'R76-3.8-NON-SELF',
        clause: '3.8 (Non-self indicating)',
        formula: 'added_load = 0.4 * |MPE| (min 1 mg)'
      };
    }
  }

  static calculate(input: DiscriminationInput): DiscriminationResult {
    const dDec = DecimalUtils.from(input.d);
    const initialIndDec = DecimalUtils.from(input.indication);
    const resultingIndDec = DecimalUtils.from(input.resultingIndication);

    const { addedLoad, ruleId, clause, formula } = this.getRequiredAddedLoad(
      input.indicationType,
      dDec,
      input.e,
      input.testLoad,
      input.accuracyClass,
      input.regulatoryMode
    );

    // Observed change in indication
    const observedChangeDec = DecimalUtils.abs(DecimalUtils.sub(resultingIndDec, initialIndDec));
    const requiredChangeDec = input.indicationType === 'digital' ? dDec : DecimalUtils.from('0.000001');

    // Clause A.4.8.2: For digital instruments, the expected final indication is strictly I + d
    const expectedIndDec = input.indicationType === 'digital'
      ? DecimalUtils.add(initialIndDec, dDec)
      : DecimalUtils.add(initialIndDec, requiredChangeDec);

    const deviationFromExpectedDec = DecimalUtils.abs(DecimalUtils.sub(resultingIndDec, expectedIndDec));

    let isCompliant = false;
    let explanation = '';

    if (input.indicationType === 'digital') {
      // Step condition: Indication must increase to exactly I + d
      // Tolerance: within 0.1d to account for minor rounding/floating display step
      const stepTolerance = DecimalUtils.mul(dDec, '0.1');

      if (DecimalUtils.eq(resultingIndDec, initialIndDec)) {
        isCompliant = false;
        explanation = `Addition of 1.4d test load (${DecimalUtils.format(input.addedLoad || addedLoad, 4)} ${input.unit}) produced NO CHANGE in indication. Failed discrimination threshold.`;
      } else if (DecimalUtils.lt(resultingIndDec, initialIndDec)) {
        isCompliant = false;
        explanation = `INVALID OBSERVATION: Resulting indication (${DecimalUtils.format(resultingIndDec, 4)} ${input.unit}) is less than initial indication (${DecimalUtils.format(initialIndDec, 4)} ${input.unit}).`;
      } else if (DecimalUtils.lte(deviationFromExpectedDec, stepTolerance)) {
        isCompliant = true;
        explanation = `Addition of 1.4d extra load (${DecimalUtils.format(input.addedLoad || addedLoad, 4)} ${input.unit}) produced the mandated indication step of exactly I + d = ${DecimalUtils.format(expectedIndDec, 4)} ${input.unit}.`;
      } else {
        // Did not step to I + d (e.g. jumped to 100 kg when 20.005 kg expected)
        isCompliant = false;
        explanation = `NON-COMPLIANT / INVALID OBSERVATION: Observed resulting indication (${DecimalUtils.format(resultingIndDec, 4)} ${input.unit}) does not satisfy the required I + d condition (expected ${DecimalUtils.format(expectedIndDec, 4)} ${input.unit} per OIML R 76-1:2006 A.4.8.2). Deviation = ${DecimalUtils.format(deviationFromExpectedDec, 4)} ${input.unit}.`;
      }
    } else {
      // Analog or non-self indicating
      isCompliant = DecimalUtils.gte(observedChangeDec, requiredChangeDec);
      explanation = isCompliant
        ? `Addition of test load (${DecimalUtils.format(input.addedLoad || addedLoad, 4)} ${input.unit}) produced required visible displacement of ${DecimalUtils.format(observedChangeDec, 4)} ${input.unit}.`
        : `Addition of test load failed to produce the required visible displacement.`;
    }

    const evaluation: RuleEvaluationResult = {
      ruleId,
      regulation: 'OIML R 76-1',
      edition: '2006',
      clause,
      annexClause: 'A.4.8.2',
      inputs: {
        testLoad: input.testLoad,
        initialIndication: DecimalUtils.toNumber(initialIndDec),
        addedLoad: DecimalUtils.toNumber(DecimalUtils.from(input.addedLoad || addedLoad)),
        resultingIndication: DecimalUtils.toNumber(resultingIndDec),
        d: DecimalUtils.toNumber(dDec),
        unit: input.unit,
        indicationType: input.indicationType
      },
      intermediateValues: {
        expectedIndication: DecimalUtils.toNumber(expectedIndDec),
        deviationFromExpected: DecimalUtils.toNumber(deviationFromExpectedDec),
        observedChange: DecimalUtils.toNumber(observedChangeDec),
        requiredChange: DecimalUtils.toNumber(requiredChangeDec),
        formula
      },
      formula: input.indicationType === 'digital'
        ? `${formula}; resulting_indication == I + d`
        : `${formula}; observed_change >= visible_displacement`,
      limit: {
        expectedIndication: DecimalUtils.toNumber(expectedIndDec),
        requiredAddedLoad: DecimalUtils.toNumber(addedLoad),
        unit: input.unit
      },
      result: {
        expectedIndication: DecimalUtils.toNumber(expectedIndDec),
        resultingIndication: DecimalUtils.toNumber(resultingIndDec),
        deviationFromExpected: DecimalUtils.toNumber(deviationFromExpectedDec),
        observedChange: DecimalUtils.toNumber(observedChangeDec),
        isCompliant
      },
      status: isCompliant ? 'PASS' : 'FAIL',
      explanation
    };

    return {
      testLoad: input.testLoad,
      initialIndication: DecimalUtils.toNumber(initialIndDec),
      addedLoad: DecimalUtils.toNumber(DecimalUtils.from(input.addedLoad || addedLoad)),
      resultingIndication: DecimalUtils.toNumber(resultingIndDec),
      expectedIndication: DecimalUtils.toNumber(expectedIndDec),
      deviationFromExpected: DecimalUtils.toNumber(deviationFromExpectedDec),
      requiredChange: DecimalUtils.toNumber(requiredChangeDec),
      observedChange: DecimalUtils.toNumber(observedChangeDec),
      status: isCompliant ? 'PASS' : 'FAIL',
      evaluation
    };
  }
}
