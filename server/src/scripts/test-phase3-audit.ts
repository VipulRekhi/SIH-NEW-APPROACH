import { DecimalUtils } from '../modules/testing/calculations/decimal.utils.js';
import { ErrorCalculator } from '../modules/testing/calculations/error.calculator.js';
import { ChangeoverCalculator } from '../modules/testing/calculations/changeover.calculator.js';
import { DiscriminationCalculator } from '../modules/testing/calculations/discrimination.calculator.js';
import { EccentricityCalculator } from '../modules/testing/calculations/eccentricity.calculator.js';
import { RepeatabilityCalculator } from '../modules/testing/calculations/repeatability.calculator.js';
import { ZeroCalculator } from '../modules/testing/calculations/zero.calculator.js';
import { TestSessionService } from '../services/test-session.service.js';
import { TestSessionRepository } from '../repositories/test-session.repository.js';
import { InstrumentRepository } from '../repositories/instrument.repository.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}`, details || '');
    failedCount++;
  }
}

async function runAuditTests() {
  console.log('================================================================');
  console.log('PHASE 3 AUDIT & REGRESSION TEST SUITE (OIML R 76-1:2006)');
  console.log('================================================================\n');

  // Test B: Weighing Error Calculation with Changeover-Point Method (Clause A.4.4.3)
  // Example from prompt: L = 10.000 kg, I = 10.078 kg, e = 0.010 kg, delta_L = 0.078 kg, E0 = 0
  // P = 10.078 + 0.5(0.010) - 0.078 = 10.005 kg
  // E = 10.005 - 10.000 = +0.005 kg
  // Ec = +0.005 - 0 = +0.005 kg
  const changeoverB = ChangeoverCalculator.calculate(10.078, 0.078, 0.010);
  assert(DecimalUtils.eq(changeoverB.calculatedP, '10.005'), 'B.1: Changeover P = 10.078 + 0.005 - 0.078 = 10.005 kg');

  const errorCalcB = ErrorCalculator.calculate({
    load: 10.000,
    indication: 10.078,
    unit: 'kg',
    additionalLoad: 0.078,
    zeroError: 0,
    e: 0.010,
    d: 0.005,
    accuracyClass: 'III',
    regulatoryMode: 'INITIAL_VERIFICATION'
  });
  assert(DecimalUtils.eq(errorCalcB.rawErrorE, '0.005'), 'B.2: Raw error E = P - L = +0.005 kg');
  assert(DecimalUtils.eq(errorCalcB.correctedErrorEc, '0.005'), 'B.3: Corrected error Ec = E - E0 = +0.005 kg');
  assert(errorCalcB.status === 'PASS', 'B.4: Error within MPE is PASS');

  // Test C: Zero Error Propagation (Traceable E0)
  // L = 10.000 kg, I = 11.000 kg, delta_L = 0.250 kg, e = 0.010 kg
  // P = 11 + 0.005 - 0.25 = 10.755 kg
  // E = 10.755 - 10.000 = +0.755 kg
  // If E0 = 0.270 kg -> Ec = 0.755 - 0.270 = +0.485 kg
  const errorCalcC = ErrorCalculator.calculate({
    load: 10.000,
    indication: 11.000,
    unit: 'kg',
    additionalLoad: 0.250,
    zeroError: 0.270,
    e: 0.010,
    d: 0.005,
    accuracyClass: 'III',
    regulatoryMode: 'INITIAL_VERIFICATION'
  });
  assert(DecimalUtils.eq(errorCalcC.rawErrorE, '0.755'), 'C.1: Raw error E = +0.755 kg');
  assert(DecimalUtils.eq(errorCalcC.correctedErrorEc, '0.485'), 'C.2: Corrected error Ec = 0.755 - 0.270 = +0.485 kg');
  assert(errorCalcC.evaluation.inputs.zeroErrorE0 === 0.27, 'C.3: E0 is explicitly recorded in evaluation inputs');

  // Test D: Eccentric Loading Error Calculation (All positions have E and Ec calculated)
  const eccCalc = EccentricityCalculator.calculate({
    maxCapacity: 30,
    unit: 'kg',
    e: 0.01,
    d: 0.005,
    accuracyClass: 'III',
    regulatoryMode: 'INITIAL_VERIFICATION',
    supportCase: 'LESS_OR_EQUAL_4_SUPPORTS',
    readings: [
      { position: 'CENTER', load: 10, indication: 10.002, additionalLoad: 0.005, zeroError: 0 },
      { position: 'FRONT_LEFT', load: 10, indication: 10.001, additionalLoad: 0.004, zeroError: 0 },
      { position: 'FRONT_RIGHT', load: 10, indication: 10.003, additionalLoad: 0.006, zeroError: 0 },
      { position: 'REAR_LEFT', load: 10, indication: 10.002, additionalLoad: 0.005, zeroError: 0 },
      { position: 'REAR_RIGHT', load: 10, indication: 10.001, additionalLoad: 0.004, zeroError: 0 }
    ]
  });
  assert(eccCalc.positions.length === 5, 'D.1: 5 eccentric positions evaluated');
  assert(eccCalc.positions.every(p => p.rawError !== undefined && p.correctedError !== undefined), 'D.2: Every position has rawError and correctedError');
  assert(eccCalc.status === 'PASS', 'D.3: All 5 compliant positions yield PASS');

  // Test E: Eccentric Loading Duplicate Position Rejection
  const eccDuplicate = EccentricityCalculator.calculate({
    maxCapacity: 30,
    unit: 'kg',
    e: 0.01,
    d: 0.005,
    accuracyClass: 'III',
    regulatoryMode: 'INITIAL_VERIFICATION',
    supportCase: 'LESS_OR_EQUAL_4_SUPPORTS',
    readings: [
      { position: 'CENTER', load: 10, indication: 10.000 },
      { position: 'CENTER', load: 10, indication: 10.000 } // Duplicate
    ]
  });
  assert(eccDuplicate.status === 'REVIEW_REQUIRED', 'E.1: Duplicate positions trigger REVIEW_REQUIRED / invalid');
  assert(eccDuplicate.evaluation.explanation.includes('Duplicate eccentric positions detected'), 'E.2: Explains duplicate position violation');

  // Test F & G: Repeatability Test (0/10 vs 10/10)
  // Fewer than 10 readings for Type Evaluation must trigger REVIEW_REQUIRED
  const repIncomplete = RepeatabilityCalculator.calculate({
    load: 15,
    unit: 'kg',
    readings: [15.000, 15.001, 15.000], // only 3 readings
    e: 0.01,
    d: 0.005,
    maxCapacity: 30,
    accuracyClass: 'III',
    regulatoryMode: 'TYPE_EVALUATION'
  });
  assert(repIncomplete.status === 'REVIEW_REQUIRED', 'F.1: Fewer than 10 readings for Type Eval (<1000kg) yields REVIEW_REQUIRED');
  assert(repIncomplete.readingsCount === 3, 'F.2: readingsCount is strictly 3');

  // Exactly 10 readings
  const repComplete = RepeatabilityCalculator.calculate({
    load: 15,
    unit: 'kg',
    readings: [15.000, 15.002, 15.001, 15.000, 15.001, 15.002, 15.001, 15.000, 15.002, 15.001],
    e: 0.01,
    d: 0.005,
    maxCapacity: 30,
    accuracyClass: 'III',
    regulatoryMode: 'TYPE_EVALUATION'
  });
  assert(repComplete.status === 'PASS', 'G.1: 10 readings with Delta_I (0.002) <= MPE (0.010) yields PASS');
  assert(repComplete.readingsCount === 10, 'G.2: readingsCount is strictly 10');

  // Test H: Discrimination Correct Case (Base = 20.000 kg, d = 0.005 kg, 1.4d = 0.007 kg, resulting = 20.005 kg)
  const discCorrect = DiscriminationCalculator.calculate({
    testLoad: 20.000,
    indication: 20.000,
    addedLoad: 0.007,
    resultingIndication: 20.005,
    unit: 'kg',
    d: 0.005,
    e: 0.010,
    accuracyClass: 'III',
    indicationType: 'digital',
    regulatoryMode: 'INITIAL_VERIFICATION'
  });
  assert(discCorrect.status === 'PASS', 'H.1: Resulting indication 20.005 kg (I + d) yields PASS');
  assert(discCorrect.expectedIndication === 20.005, 'H.2: Expected indication is strictly 20.005 kg');
  assert(discCorrect.deviationFromExpected === 0, 'H.3: Deviation from expected is 0 kg');

  // Test I: Discrimination Invalid Case (Resulting = 100.000 kg on initial = 20.000 kg)
  const discInvalid = DiscriminationCalculator.calculate({
    testLoad: 20.000,
    indication: 20.000,
    addedLoad: 0.007,
    resultingIndication: 100.000,
    unit: 'kg',
    d: 0.005,
    e: 0.010,
    accuracyClass: 'III',
    indicationType: 'digital',
    regulatoryMode: 'INITIAL_VERIFICATION'
  });
  assert(discInvalid.status === 'FAIL', 'I.1: Resulting indication 100.000 kg MUST NOT PASS (must FAIL)');
  assert(discInvalid.deviationFromExpected === 79.995, 'I.2: Deviation 79.995 kg accurately measured');
  assert(discInvalid.evaluation.explanation.includes('does not satisfy the required I + d condition'), 'I.3: Clear regulatory rejection reason');

  // Test J: Discrimination No Change Case
  const discNoChange = DiscriminationCalculator.calculate({
    testLoad: 20.000,
    indication: 20.000,
    addedLoad: 0.007,
    resultingIndication: 20.000,
    unit: 'kg',
    d: 0.005,
    e: 0.010,
    accuracyClass: 'III',
    indicationType: 'digital',
    regulatoryMode: 'INITIAL_VERIFICATION'
  });
  assert(discNoChange.status === 'FAIL', 'J.1: Resulting indication equal to initial (no step) yields FAIL');

  // Test L: Decimal exactness & Non-finite handling
  assert(DecimalUtils.eq(DecimalUtils.add('0.1', '0.2'), '0.3'), 'L.1: Exact Decimal arithmetic 0.1 + 0.2 = 0.3');

  // Summary
  console.log('\n================================================================');
  console.log(`AUDIT EXECUTION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAuditTests().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
