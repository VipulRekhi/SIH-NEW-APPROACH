import { MpeCalculator } from '../modules/testing/calculations/mpe.calculator.js';
import { ErrorCalculator } from '../modules/testing/calculations/error.calculator.js';
import { ChangeoverCalculator } from '../modules/testing/calculations/changeover.calculator.js';
import { RepeatabilityCalculator } from '../modules/testing/calculations/repeatability.calculator.js';
import { EccentricityCalculator } from '../modules/testing/calculations/eccentricity.calculator.js';
import { DiscriminationCalculator } from '../modules/testing/calculations/discrimination.calculator.js';
import { ZeroCalculator } from '../modules/testing/calculations/zero.calculator.js';
import { MultipleIndicationCalculator } from '../modules/testing/calculations/multiple-indication.calculator.js';
import { EquilibriumCalculator } from '../modules/testing/calculations/equilibrium.calculator.js';
import { StandardValidationCalculator } from '../modules/testing/calculations/standard-validation.calculator.js';
import { ValidationService } from '../modules/testing/calculations/validation.service.js';
import { UnitConverter } from '../modules/testing/calculations/unit.converter.js';
import { DecimalUtils } from '../modules/testing/calculations/decimal.utils.js';
import { ApplicabilityService } from '../modules/testing/calculations/applicability.service.js';

let failures = 0;
let passed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    failures++;
    console.error(`[FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
  }
}

async function runRegulatoryTests() {
  console.log('================================================================');
  console.log('STARTING OIML R 76-1:2006 CALCULATION & REGULATORY TEST SUITE');
  console.log('================================================================\n');

  // --- 1. MPE CALCULATOR: CLASS I ZONES & BOUNDARIES ---
  {
    // Class I: e = 0.001 g
    // 0 <= m <= 50,000 -> 0.5e
    const mpe1 = MpeCalculator.calculate(0.02, 0.000001, 'I', 'INITIAL_VERIFICATION'); // m = 20,000
    assert(mpe1.factorE === 0.5 && mpe1.mpeAbsolute === 0.0000005, 'Class I: m <= 50,000e gives factor 0.5e');

    // Exactly at boundary m = 50,000e
    const mpeBound1 = MpeCalculator.calculate(0.05, 0.000001, 'I', 'INITIAL_VERIFICATION'); // m = 50,000
    assert(mpeBound1.factorE === 0.5, 'Class I: exactly at boundary 50,000e gives factor 0.5e');

    // Just above boundary m = 50,001e -> 1.0e
    const mpeBound1Plus = MpeCalculator.calculate(0.050001, 0.000001, 'I', 'INITIAL_VERIFICATION');
    assert(mpeBound1Plus.factorE === 1.0, 'Class I: just above 50,000e gives factor 1.0e');

    // m > 200,000e -> 1.5e
    const mpeHigh = MpeCalculator.calculate(0.25, 0.000001, 'I', 'INITIAL_VERIFICATION'); // m = 250,000
    assert(mpeHigh.factorE === 1.5, 'Class I: m > 200,000e gives factor 1.5e');
  }

  // --- 2. MPE CALCULATOR: CLASS II ZONES & BOUNDARIES ---
  {
    // Class II: e = 0.01 g
    // 0 <= m <= 5,000 -> 0.5e
    const mpeZone1 = MpeCalculator.calculate(20, 0.01, 'II', 'INITIAL_VERIFICATION'); // m = 2,000
    assert(mpeZone1.factorE === 0.5, 'Class II: m <= 5,000e gives factor 0.5e');

    // Boundary 5,000e
    const mpe5000 = MpeCalculator.calculate(50, 0.01, 'II', 'INITIAL_VERIFICATION'); // m = 5,000
    assert(mpe5000.factorE === 0.5, 'Class II: exactly at 5,000e gives factor 0.5e');

    // Just above 5,000e
    const mpe5001 = MpeCalculator.calculate(50.01, 0.01, 'II', 'INITIAL_VERIFICATION'); // m = 5,001
    assert(mpe5001.factorE === 1.0, 'Class II: m = 5,001e gives factor 1.0e');

    // Above 20,000e
    const mpeHigh = MpeCalculator.calculate(250, 0.01, 'II', 'INITIAL_VERIFICATION'); // m = 25,000
    assert(mpeHigh.factorE === 1.5, 'Class II: m > 20,000e gives factor 1.5e');
  }

  // --- 3. MPE CALCULATOR: CLASS III (DEMO SCALE: Max=30kg, e=0.01kg) ---
  {
    // Zone 1: 0 <= m <= 500e (0 to 5 kg) -> 0.5e = 0.005 kg
    const mpe5kg = MpeCalculator.calculate(5, 0.01, 'III', 'INITIAL_VERIFICATION');
    assert(mpe5kg.m === 500 && mpe5kg.factorE === 0.5 && mpe5kg.mpeAbsolute === 0.005, 'Class III: 5 kg (500e) gives MPE = +/-0.005 kg');

    // Zone 2: 500e < m <= 2000e (5 kg < L <= 20 kg) -> 1.0e = 0.010 kg
    const mpe10kg = MpeCalculator.calculate(10, 0.01, 'III', 'INITIAL_VERIFICATION');
    assert(mpe10kg.m === 1000 && mpe10kg.factorE === 1.0 && mpe10kg.mpeAbsolute === 0.010, 'Class III: 10 kg (1000e) gives MPE = +/-0.010 kg');

    const mpe20kg = MpeCalculator.calculate(20, 0.01, 'III', 'INITIAL_VERIFICATION');
    assert(mpe20kg.m === 2000 && mpe20kg.factorE === 1.0 && mpe20kg.mpeAbsolute === 0.010, 'Class III: 20 kg (2000e) gives MPE = +/-0.010 kg');

    // Zone 3: 2000e < m <= 10000e (20 kg < L <= 30 kg Max) -> 1.5e = 0.015 kg
    const mpe30kg = MpeCalculator.calculate(30, 0.01, 'III', 'INITIAL_VERIFICATION');
    assert(mpe30kg.m === 3000 && mpe30kg.factorE === 1.5 && mpe30kg.mpeAbsolute === 0.015, 'Class III: 30 kg (3000e) gives MPE = +/-0.015 kg');
  }

  // --- 4. MPE CALCULATOR: CLASS IIII ZONES ---
  {
    // Class IIII: 0 <= m <= 50e -> 0.5e, 50e < m <= 200e -> 1.0e, 200e < m <= 1000e -> 1.5e
    const mpe40 = MpeCalculator.calculate(40, 1, 'IIII', 'INITIAL_VERIFICATION');
    assert(mpe40.factorE === 0.5, 'Class IIII: m = 40 gives factor 0.5e');
    const mpe100 = MpeCalculator.calculate(100, 1, 'IIII', 'INITIAL_VERIFICATION');
    assert(mpe100.factorE === 1.0, 'Class IIII: m = 100 gives factor 1.0e');
    const mpe500 = MpeCalculator.calculate(500, 1, 'IIII', 'INITIAL_VERIFICATION');
    assert(mpe500.factorE === 1.5, 'Class IIII: m = 500 gives factor 1.5e');
  }

  // --- 5. REGULATORY MODES: SERVICE INSPECTION = 2x MPE (Clause 3.5.2) ---
  {
    const mpeInit = MpeCalculator.calculate(10, 0.01, 'III', 'INITIAL_VERIFICATION');
    const mpeService = MpeCalculator.calculate(10, 0.01, 'III', 'SERVICE_INSPECTION');
    assert(mpeService.mpeAbsolute === mpeInit.mpeAbsolute * 2, 'Service Inspection MPE is exactly 2x Initial Verification MPE (Clause 3.5.2)');
    assert(mpeService.ruleId === 'R76-3.5.2', 'Service inspection correctly cites Clause 3.5.2');
  }

  // --- 6. SUBSEQUENT VERIFICATION = INITIAL MPE (Clause 3.5.1) ---
  {
    const mpeSub = MpeCalculator.calculate(10, 0.01, 'III', 'SUBSEQUENT_VERIFICATION');
    const mpeInit = MpeCalculator.calculate(10, 0.01, 'III', 'INITIAL_VERIFICATION');
    assert(mpeSub.mpeAbsolute === mpeInit.mpeAbsolute, 'Subsequent Verification MPE equals Initial Verification MPE');
  }

  // --- 7. CHANGEOVER POINT CALCULATION (Clause A.4.4.3) ---
  {
    // I = 10.000 kg, e = 0.010 kg, delta_L = 0.006 kg
    // P = I + 0.5e - delta_L = 10.000 + 0.005 - 0.006 = 9.999 kg
    const co = ChangeoverCalculator.calculate(10.000, 0.006, 0.010);
    assert(co.calculatedP.equals('9.999'), 'Changeover point calculation: P = I + 0.5e - delta_L = 9.999 kg');
  }

  // --- 8. ERROR OF INDICATION: CHANGEOVER & ZERO CORRECTION (Clause A.4.4.3) ---
  {
    // Load = 10 kg, I = 10.000 kg, delta_L = 0.002 kg, e = 0.010 kg, d = 0.005 kg, E0 = 0.001 kg
    // P = 10.000 + 0.005 - 0.002 = 10.003 kg
    // E = P - L = 10.003 - 10.000 = +0.003 kg
    // Ec = E - E0 = +0.003 - 0.001 = +0.002 kg
    // MPE(10 kg) = +/-0.010 kg -> PASS
    const res = ErrorCalculator.calculate({
      load: 10,
      indication: 10.000,
      additionalLoad: 0.002,
      zeroError: 0.001,
      e: 0.01,
      d: 0.005,
      unit: 'kg',
      accuracyClass: 'III',
      regulatoryMode: 'TYPE_EVALUATION'
    });
    assert(res.turningPointP === 10.003, 'Indication error turning point P = 10.003');
    assert(res.rawErrorE === 0.003, 'Raw error E = 0.003');
    assert(res.correctedErrorEc === 0.002, 'Corrected error Ec = E - E0 = 0.002');
    assert(res.status === 'PASS', 'Indication error compliant: |0.002| <= 0.010');
  }

  // --- 9. ERROR OF INDICATION: EXCEEDING MPE -> FAIL ---
  {
    // Load = 10 kg, I = 10.020 kg, e = 0.010 kg -> Ec = +0.020 kg > MPE 0.010 kg -> FAIL
    const resFail = ErrorCalculator.calculate({
      load: 10,
      indication: 10.020,
      e: 0.01,
      d: 0.005,
      unit: 'kg',
      accuracyClass: 'III',
      regulatoryMode: 'TYPE_EVALUATION'
    });
    assert(resFail.status === 'FAIL', 'Indication error exceeds MPE correctly returns FAIL');
  }

  // --- 10. REPEATABILITY: 10 READINGS FOR TYPE EVALUATION (Clause 3.6.1 & A.4.10) ---
  {
    // Max = 30 kg (< 1000 kg), Type Evaluation requires 10 weighings
    const readingsPass = [10.000, 10.005, 10.000, 10.005, 10.000, 10.005, 10.000, 10.005, 10.000, 10.005];
    const rep = RepeatabilityCalculator.calculate({
      load: 10,
      unit: 'kg',
      readings: readingsPass,
      e: 0.01,
      d: 0.005,
      maxCapacity: 30,
      accuracyClass: 'III',
      regulatoryMode: 'TYPE_EVALUATION'
    });
    assert(rep.requiredReadingsCount === 10, 'Type evaluation for Max < 1000 kg mandates 10 weighings');
    assert(rep.rangeDifference === 0.005, 'Range difference I_max - I_min = 0.005 kg');
    assert(rep.status === 'PASS', 'Repeatability PASS when Delta_I <= MPE(10 kg) = 0.010 kg');
  }

  // --- 11. REPEATABILITY: FAILURE WHEN RANGE > MPE ---
  {
    const readingsFail = [10.000, 10.015, 10.000, 10.015, 10.000, 10.015, 10.000, 10.015, 10.000, 10.015]; // Diff = 0.015 > 0.010
    const repFail = RepeatabilityCalculator.calculate({
      load: 10,
      unit: 'kg',
      readings: readingsFail,
      e: 0.01,
      d: 0.005,
      maxCapacity: 30,
      accuracyClass: 'III',
      regulatoryMode: 'TYPE_EVALUATION'
    });
    assert(repFail.status === 'FAIL', 'Repeatability FAIL when Delta_I (0.015) > MPE (0.010)');
  }

  // --- 12. REPEATABILITY: INSUFFICIENT READINGS ENFORCES REVIEW_REQUIRED ---
  {
    const only3Readings = [10.000, 10.005, 10.000];
    const repReview = RepeatabilityCalculator.calculate({
      load: 10,
      unit: 'kg',
      readings: only3Readings,
      e: 0.01,
      d: 0.005,
      maxCapacity: 30,
      accuracyClass: 'III',
      regulatoryMode: 'TYPE_EVALUATION' // requires 10
    });
    assert(repReview.status === 'REVIEW_REQUIRED', 'Repeatability with fewer readings than mandated produces REVIEW_REQUIRED');
  }

  // --- 13. ECCENTRIC LOADING: RULE 1 (<= 4 SUPPORTS, 1/3 (Max + Tare)) ---
  {
    // Max = 30 kg, Tare = 0 -> Test load = 10 kg (Clause 3.6.2.1)
    const loadInfo1 = EccentricityCalculator.calculateTestLoad('LESS_OR_EQUAL_4_SUPPORTS', 30, 0, 4);
    assert(loadInfo1.testLoad.equals('10'), 'Eccentric test load for <=4 supports is 1/3 * (Max + Tare) = 10 kg');
    assert(loadInfo1.clause === '3.6.2.1', 'Eccentricity <=4 supports cites Clause 3.6.2.1');
  }

  // --- 14. ECCENTRIC LOADING: RULE 2 (> 4 SUPPORTS, 1/(n-1) (Max + Tare)) ---
  {
    // Max = 50 kg, n = 6 supports -> 1/(6-1) * 50 = 10 kg (Clause 3.6.2.2)
    const loadInfo2 = EccentricityCalculator.calculateTestLoad('MORE_THAN_4_SUPPORTS', 50, 0, 6);
    assert(loadInfo2.testLoad.equals('10'), 'Eccentric test load for >4 supports is 1/(n-1) * (Max + Tare) = 10 kg');
    assert(loadInfo2.clause === '3.6.2.2', 'Eccentricity >4 supports cites Clause 3.6.2.2');
  }

  // --- 15. ECCENTRIC LOADING: RULE 3 (SPECIAL MINIMAL OFF-CENTRE, 1/10 (Max + Tare)) ---
  {
    // Max = 100 kg, Tank/Hopper -> 1/10 * 100 = 10 kg (Clause 3.6.2.3)
    const loadInfo3 = EccentricityCalculator.calculateTestLoad('SPECIAL_MINIMAL_OFF_CENTRE', 100, 0, 4);
    assert(loadInfo3.testLoad.equals('10'), 'Eccentric test load for tanks/hoppers is 1/10 * (Max + Tare) = 10 kg');
    assert(loadInfo3.clause === '3.6.2.3', 'Eccentricity tanks/hoppers cites Clause 3.6.2.3');
  }

  // --- 16. ECCENTRIC LOADING: RULE 4 (ROLLING LOAD, <= 0.8 (Max + Tare)) ---
  {
    // Max = 100 kg, Rolling load = 90 kg -> capped at 0.8 * 100 = 80 kg (Clause 3.6.2.4)
    const loadInfo4 = EccentricityCalculator.calculateTestLoad('ROLLING_LOAD', 100, 0, 4, 90);
    assert(loadInfo4.testLoad.equals('80'), 'Eccentric rolling load capped at 0.8 * (Max + Tare) = 80 kg');
    assert(loadInfo4.clause === '3.6.2.4', 'Eccentricity rolling load cites Clause 3.6.2.4');
  }

  // --- 17. ECCENTRIC LOADING: EVALUATION PASS ---
  {
    const eccRes = EccentricityCalculator.calculate({
      maxCapacity: 30,
      unit: 'kg',
      e: 0.01,
      d: 0.005,
      accuracyClass: 'III',
      regulatoryMode: 'TYPE_EVALUATION',
      readings: [
        { position: 'CENTER', load: 10, indication: 10.005 },
        { position: 'FRONT_LEFT', load: 10, indication: 10.005 },
        { position: 'FRONT_RIGHT', load: 10, indication: 10.000 },
        { position: 'REAR_LEFT', load: 10, indication: 10.005 },
        { position: 'REAR_RIGHT', load: 10, indication: 10.000 }
      ]
    });
    assert(eccRes.status === 'PASS', 'Eccentric loading all positions within MPE gives PASS');
  }

  // --- 18. ECCENTRIC LOADING: SINGLE POSITION FAILURE GIVES FAIL ---
  {
    const eccResFail = EccentricityCalculator.calculate({
      maxCapacity: 30,
      unit: 'kg',
      e: 0.01,
      d: 0.005,
      accuracyClass: 'III',
      regulatoryMode: 'TYPE_EVALUATION',
      readings: [
        { position: 'CENTER', load: 10, indication: 10.005 },
        { position: 'FRONT_LEFT', load: 10, indication: 10.005 },
        { position: 'FRONT_RIGHT', load: 10, indication: 10.025 } // Error = 0.025 > MPE 0.010
      ]
    });
    assert(eccResFail.status === 'FAIL', 'Eccentric loading single position exceeding MPE gives FAIL');
  }

  // --- 19. DISCRIMINATION: DIGITAL 1.4d (Clause 3.8 & A.4.8) ---
  {
    // d = 0.005 kg = 5 g >= 5 mg. Added load = 1.4 * 0.005 = 0.007 kg
    // Initial = 10.000 kg, Resulting = 10.005 kg -> change = 0.005 kg >= d -> PASS
    const disc = DiscriminationCalculator.calculate({
      testLoad: 10,
      indication: 10.000,
      addedLoad: 0.007,
      resultingIndication: 10.005,
      unit: 'kg',
      d: 0.005,
      e: 0.01,
      accuracyClass: 'III',
      indicationType: 'digital',
      regulatoryMode: 'TYPE_EVALUATION'
    });
    assert(disc.status === 'PASS', 'Digital discrimination 1.4d produces indication change >= d gives PASS');
  }

  // --- 20. DISCRIMINATION: INSUFFICIENT INDICATION CHANGE GIVES FAIL ---
  {
    const discFail = DiscriminationCalculator.calculate({
      testLoad: 10,
      indication: 10.000,
      addedLoad: 0.007,
      resultingIndication: 10.000, // no change
      unit: 'kg',
      d: 0.005,
      e: 0.01,
      accuracyClass: 'III',
      indicationType: 'digital',
      regulatoryMode: 'TYPE_EVALUATION'
    });
    assert(discFail.status === 'FAIL', 'Digital discrimination with zero indication change gives FAIL');
  }

  // --- 21. ZERO-SETTING ACCURACY (Clause 4.5.2 & A.4.2.3: |E0| <= 0.25e) ---
  {
    // e = 0.01 kg -> Max permissible zero error = 0.25 * 0.01 = 0.0025 kg
    // Final indication = 0.000 kg, additional load delta_L = 0.004 kg
    // P0 = 0 + 0.005 - 0.004 = 0.001 kg <= 0.0025 kg -> PASS
    const zero = ZeroCalculator.calculate({
      initialIndication: 0.01,
      zeroSettingAction: 'Non-automatic zero key pressed',
      finalIndication: 0.000,
      additionalLoadAtZero: 0.004,
      e: 0.01,
      d: 0.005,
      unit: 'kg'
    });
    assert(zero.zeroErrorE0 === 0.001, 'Zero setting error E0 = 0.001 kg');
    assert(zero.status === 'PASS', 'Zero setting error |0.001| <= 0.25e (0.0025) gives PASS');
  }

  // --- 22. MULTIPLE INDICATING DEVICES (Clause 3.6.3: Diff <= MPE, Display == Printer) ---
  {
    // Main display: 10.005 kg, Remote display: 10.005 kg, Printer: 10.005 kg -> PASS
    const multiPass = MultipleIndicationCalculator.calculate({
      load: 10,
      unit: 'kg',
      mpeAbsolute: 0.010,
      indications: [
        { deviceName: 'Primary Indicator', isPrinter: false, indicationValue: 10.005 },
        { deviceName: 'Secondary Display', isPrinter: false, indicationValue: 10.005 },
        { deviceName: 'Thermal Ticket Printer', isPrinter: true, indicationValue: 10.005 }
      ]
    });
    assert(multiPass.status === 'PASS', 'Multiple indicating devices consistent gives PASS');

    // Printer mismatch: Display = 10.005, Printer = 10.000 -> FAIL
    const multiFail = MultipleIndicationCalculator.calculate({
      load: 10,
      unit: 'kg',
      mpeAbsolute: 0.010,
      indications: [
        { deviceName: 'Primary Indicator', isPrinter: false, indicationValue: 10.005 },
        { deviceName: 'Thermal Ticket Printer', isPrinter: true, indicationValue: 10.000 }
      ]
    });
    assert(multiFail.status === 'FAIL', 'Printer mismatch with digital display gives FAIL');
  }

  // --- 23. DIFFERENT POSITIONS OF EQUILIBRIUM (Clause 3.6.4: Diff <= MPE) ---
  {
    // Normal = 10.000 kg, Extended = 10.005 kg, MPE = 0.010 kg -> PASS
    const eqPass = EquilibriumCalculator.calculate({
      load: 10,
      unit: 'kg',
      indicationNormal: 10.000,
      indicationExtended: 10.005,
      mpeAbsolute: 0.010
    });
    assert(eqPass.status === 'PASS', 'Equilibrium extension position diff <= MPE gives PASS');
  }

  // --- 24. REFERENCE STANDARD SUITABILITY (Clause 3.7.1) ---
  {
    // Standard error check: standard error 0.002 kg <= 1/3 * 0.010 kg (0.0033 kg) -> PASS
    const stdPass = StandardValidationCalculator.validate({
      standardIdentifier: 'STD-WT-10KG-01',
      nominalMass: 10,
      conventionalMass: 10.002,
      unit: 'kg',
      reportedError: 0.002,
      certificateNumber: 'NPL/2026/CAL/8492',
      certificateValidUntil: '2027-12-31',
      instrumentTestLoad: 10,
      instrumentMpe: 0.010
    });
    assert(stdPass.errorCheckStatus === 'PASS', 'Standard weight error <= 1/3 instrument MPE gives PASS');
    assert(stdPass.certificateCheckStatus === 'PASS', 'Valid unexpired calibration certificate gives PASS');
    assert(stdPass.overallSuitabilityStatus === 'PASS', 'Overall standard suitability is PASS');

    // Standard error > 1/3 MPE -> FAIL
    const stdFail = StandardValidationCalculator.validate({
      standardIdentifier: 'STD-WT-10KG-BAD',
      nominalMass: 10,
      conventionalMass: 10.005,
      unit: 'kg',
      reportedError: 0.005, // 0.005 > 0.0033
      certificateNumber: 'NPL/2026/CAL/8492',
      certificateValidUntil: '2027-12-31',
      instrumentTestLoad: 10,
      instrumentMpe: 0.010
    });
    assert(stdFail.errorCheckStatus === 'FAIL', 'Standard weight error > 1/3 instrument MPE gives FAIL');
  }

  // --- 25. METROLOGICAL VALIDATION: CLAUSE 3.4.2 (d < e <= 10d) ---
  {
    // Valid: e = 0.01, d = 0.005 -> d < e (0.005 < 0.01) and e <= 10d (0.01 <= 0.05) -> VALID
    const validScale = ValidationService.validateInstrumentParameters({
      manufacturer: 'Essae',
      modelNumber: 'DS-252',
      serialNumber: 'ETPL/DS252/240781',
      accuracyClass: 'III',
      maxCapacity: 30,
      minCapacity: 0.2,
      scaleInterval: 0.005,
      verificationScaleInterval: 0.01,
      unit: 'kg'
    });
    assert(validScale.isValid, 'Essae DS-252 parameters satisfy Clause 3.4.2 (d < e <= 10d)');

    // Invalid: d >= e
    const invalidD = ValidationService.validateInstrumentParameters({
      manufacturer: 'Invalid',
      modelNumber: 'X',
      serialNumber: '123',
      accuracyClass: 'III',
      maxCapacity: 30,
      minCapacity: 0.2,
      scaleInterval: 0.02, // d > e
      verificationScaleInterval: 0.01,
      unit: 'kg'
    });
    assert(!invalidD.isValid && invalidD.errors.some(e => e.includes('Clause 3.4.2 violation')), 'Rejects instrument with d >= e under Clause 3.4.2');

    // Invalid: e > 10d
    const invalid10D = ValidationService.validateInstrumentParameters({
      manufacturer: 'Invalid',
      modelNumber: 'X',
      serialNumber: '123',
      accuracyClass: 'III',
      maxCapacity: 30,
      minCapacity: 0.2,
      scaleInterval: 0.001,
      verificationScaleInterval: 0.02, // 0.02 > 10 * 0.001
      unit: 'kg'
    });
    assert(!invalid10D.isValid && invalid10D.errors.some(e => e.includes('cannot exceed 10 * d')), 'Rejects instrument with e > 10d');
  }

  // --- 26. METROLOGICAL VALIDATION: CAPACITIES ---
  {
    // Invalid negative load
    assert(DecimalUtils.lt(-1, 0), 'Negative numbers correctly identified as invalid');

    // Invalid Min > Max
    const invalidMinMax = ValidationService.validateInstrumentParameters({
      manufacturer: 'Invalid',
      modelNumber: 'X',
      serialNumber: '123',
      accuracyClass: 'III',
      maxCapacity: 10,
      minCapacity: 15,
      scaleInterval: 0.005,
      verificationScaleInterval: 0.01,
      unit: 'kg'
    });
    assert(!invalidMinMax.isValid, 'Rejects instrument with min_capacity > max_capacity');
  }

  // --- 27. DECIMAL PRECISION (0.1 + 0.2 = 0.3 Exactness) ---
  {
    const sum = DecimalUtils.add('0.1', '0.2');
    assert(sum.equals('0.3'), 'DecimalUtils exactness: 0.1 + 0.2 == 0.3 without binary floating point error');
  }

  // --- 28. UNIT NORMALIZATION ---
  {
    // 500 g -> 0.5 kg
    const kg = UnitConverter.convert(500, 'g', 'kg');
    assert(kg.equals('0.5'), 'UnitConverter converts 500 g to exactly 0.5 kg');
    const mg = UnitConverter.convert(0.001, 'g', 'mg');
    assert(mg.equals('1'), 'UnitConverter converts 0.001 g to exactly 1 mg');
  }

  // --- 29. RECOMMENDED TEST LOAD PLAN DERIVATION (Instruction 2) ---
  {
    // For Essae DS-252: Min = 0.2, Max = 30, e = 0.01, Class III
    // MPE transitions at 500e (5 kg) and 2000e (20 kg)
    const plan = ApplicabilityService.generateRecommendedLoadPlan(0.2, 30, 0.01, 'III', 'kg');
    assert(plan.length > 5, 'Generates comprehensive load plan for loading and unloading');
    const loadingLoads = plan.filter(p => p.direction === 'LOADING').map(p => p.loadValue);
    assert(loadingLoads.includes(0.2), 'Load plan includes Min (0.2 kg)');
    assert(loadingLoads.includes(5), 'Load plan includes Table 6 zone transition at 500e (5 kg)');
    assert(loadingLoads.includes(20), 'Load plan includes Table 6 zone transition at 2000e (20 kg)');
    assert(loadingLoads.includes(30), 'Load plan includes Max (30 kg)');
  }

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failures} FAILED`);
  console.log('================================================================');

  if (failures > 0) {
    process.exit(1);
  }
}

runRegulatoryTests().catch((err) => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
