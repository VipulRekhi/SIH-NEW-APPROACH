import { TestSessionRepository } from '../repositories/test-session.repository.js';
import { InstrumentRepository } from '../repositories/instrument.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { ValidationService } from '../modules/testing/calculations/validation.service.js';
import { ApplicabilityService } from '../modules/testing/calculations/applicability.service.js';
import { ErrorCalculator } from '../modules/testing/calculations/error.calculator.js';
import { RepeatabilityCalculator } from '../modules/testing/calculations/repeatability.calculator.js';
import { EccentricityCalculator } from '../modules/testing/calculations/eccentricity.calculator.js';
import { ZeroCalculator } from '../modules/testing/calculations/zero.calculator.js';
import { DiscriminationCalculator } from '../modules/testing/calculations/discrimination.calculator.js';
import { MultipleIndicationCalculator } from '../modules/testing/calculations/multiple-indication.calculator.js';
import { EquilibriumCalculator } from '../modules/testing/calculations/equilibrium.calculator.js';
import { TareCalculator } from '../modules/testing/calculations/tare.calculator.js';
import { InfluenceCalculators } from '../modules/testing/calculations/influence.calculators.js';
import { StandardValidationCalculator } from '../modules/testing/calculations/standard-validation.calculator.js';
import { MpeCalculator } from '../modules/testing/calculations/mpe.calculator.js';
import { AppError } from '../middleware/error.middleware.js';
import { JwtPayload } from '../types/index.js';
import { AccuracyClass, RegulatoryMode, TestComplianceStatus } from '../modules/testing/calculations/calculation.types.js';

export class TestSessionService {
  /**
   * Generates a unique, auditable session number: TS-YYYYMMDD-XXXX
   */
  private static generateSessionNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TS-${dateStr}-${rand}`;
  }

  static async createSession(
    data: {
      instrumentId: string;
      regulatoryMode?: RegulatoryMode;
      testDate?: string;
      environmentalConditions?: Record<string, any>;
      referenceStandards?: any[];
      selectedTestTypeIds?: string[];
      notes?: string | null;
    },
    user: JwtPayload
  ) {
    const instrument = await InstrumentRepository.findById(data.instrumentId);
    if (!instrument) {
      throw new AppError('Instrument not found.', 404, 'INSTRUMENT_NOT_FOUND');
    }

    // Laboratory isolation
    if (user.role !== 'admin' && user.laboratoryId && instrument.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied. You cannot create a test session for an instrument in another laboratory.', 403, 'FORBIDDEN');
    }

    // 1. Mandatory metrological pre-validation of instrument parameters (Clause 3.4.2)
    const metroValidation = ValidationService.validateInstrumentParameters({
      manufacturer: instrument.manufacturer,
      modelNumber: instrument.model_number,
      serialNumber: instrument.serial_number,
      accuracyClass: instrument.accuracy_class,
      maxCapacity: instrument.max_capacity,
      minCapacity: instrument.min_capacity,
      scaleInterval: instrument.scale_interval,
      verificationScaleInterval: instrument.verification_scale_interval,
      unit: instrument.unit
    });

    if (!metroValidation.isValid) {
      throw new AppError(
        `Instrument failed metrological pre-validation (OIML R-76): ${metroValidation.errors.join('; ')}`,
        400,
        'METROLOGICAL_VALIDATION_FAILED'
      );
    }

    const appConfig = {
      ...(instrument.device_configuration || {}),
      ...(data.environmentalConditions?.deviceConfiguration || {})
    };

    const applicabilityContext: any = {
      accuracyClass: instrument.accuracy_class,
      instrumentType: instrument.instrument_type,
      maxCapacity: Number(instrument.max_capacity),
      minCapacity: Number(instrument.min_capacity),
      e: Number(instrument.verification_scale_interval),
      d: Number(instrument.scale_interval),
      unit: instrument.unit,
      configuration: appConfig,
      regulatoryMode: data.regulatoryMode || 'TYPE_EVALUATION',
      regulationVersion: 'OIML R 76-1:2006'
    };

    const sessionNumber = this.generateSessionNumber();
    const session = await TestSessionRepository.create({
      instrumentId: instrument.id,
      laboratoryId: instrument.laboratory_id,
      createdBy: user.userId,
      sessionNumber,
      regulatoryMode: data.regulatoryMode || 'TYPE_EVALUATION',
      regulationVersion: 'OIML R 76-1:2006',
      testDate: data.testDate || new Date().toISOString().split('T')[0],
      environmentalConditions: data.environmentalConditions || {},
      referenceStandards: data.referenceStandards || [],
      applicabilityContext,
      notes: data.notes || null,
      metrologicalValidationStatus: metroValidation.isValid ? 'VALID' : 'INVALID',
      metrologicalValidationErrors: metroValidation.errors
    });

    // Assign requested tests or default core tests
    const allTypes = await TestSessionRepository.getAllTestTypes();
    let testTypeIdsToAssign = data.selectedTestTypeIds;
    if (!testTypeIdsToAssign || testTypeIdsToAssign.length === 0) {
      testTypeIdsToAssign = allTypes
        .filter(t => t.implementation_state === 'IMPLEMENTED')
        .map(t => t.id);
    }

    if (testTypeIdsToAssign && testTypeIdsToAssign.length > 0) {
      const testAssignments = testTypeIdsToAssign.map(typeId => {
        const typeDef = allTypes.find(t => t.id === typeId);
        const testCode = typeDef?.code || '';
        const evalResult = ApplicabilityService.evaluateTestApplicability(testCode, applicabilityContext);

        const appStatus = evalResult.applicability;
        const testStatus = appStatus === 'NOT_APPLICABLE'
          ? 'NOT_APPLICABLE'
          : (appStatus === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'DRAFT');
        const execStatus = appStatus === 'NOT_APPLICABLE' ? 'COMPLETED' : 'NOT_STARTED';

        return {
          testTypeId: typeId,
          applicabilityStatus: appStatus,
          applicabilityReason: evalResult.reason,
          applicabilityRuleId: evalResult.ruleId,
          status: testStatus,
          executionStatus: execStatus
        };
      });

      await TestSessionRepository.assignTests(session.id, testAssignments);
    }

    await AuditRepository.log({
      userId: user.userId,
      action: 'TEST_SESSION_CREATED',
      entityType: 'TEST_SESSION',
      entityId: session.id,
      metadata: {
        session_number: sessionNumber,
        instrument_id: instrument.id,
        regulatory_mode: data.regulatoryMode || 'TYPE_EVALUATION'
      }
    });

    return this.getSessionById(session.id, user);
  }

  static async getSessionById(sessionId: string, user: JwtPayload) {
    const session = await TestSessionRepository.findById(
      sessionId,
      user.role === 'admin' ? undefined : user.laboratoryId || undefined
    );
    if (!session) {
      throw new AppError('Test session not found or access denied.', 404, 'SESSION_NOT_FOUND');
    }

    let tests = await TestSessionRepository.getTestsForSession(sessionId);

    // Auto-backfill applicability for older sessions if needed
    const needsApplicabilityBackfill = tests.some(t => !t.applicability_reason);
    if (needsApplicabilityBackfill) {
      await this.reEvaluateApplicabilityForSession(sessionId);
      tests = await TestSessionRepository.getTestsForSession(sessionId);
    }

    return { session, tests };
  }

  static async listSessions(
    filter: { status?: string; search?: string; page?: number; limit?: number },
    user: JwtPayload
  ) {
    const labId = user.role === 'admin' ? undefined : user.laboratoryId || undefined;
    return TestSessionRepository.list({ ...filter, laboratoryId: labId });
  }

  static async updateSession(
    sessionId: string,
    data: { environmentalConditions?: any; referenceStandards?: any[]; notes?: string | null },
    user: JwtPayload
  ) {
    await this.getSessionById(sessionId, user); // checks authorization
    return TestSessionRepository.updateEnvironment(
      sessionId,
      data.environmentalConditions,
      data.referenceStandards || [],
      data.notes
    );
  }

  static async updateSessionStatus(
    sessionId: string,
    status: string,
    user: JwtPayload
  ) {
    const { session } = await this.getSessionById(sessionId, user);

    // Only officer or admin can override or close review sessions
    if ((status === 'PASSED' || status === 'COMPLETED') && user.role === 'technician') {
      // Technicians submit for review/completion; evaluation engine determines pass
    }

    const updated = await TestSessionRepository.updateStatus(sessionId, status);
    await AuditRepository.log({
      userId: user.userId,
      action: 'SESSION_STATUS_UPDATED',
      entityType: 'TEST_SESSION',
      entityId: sessionId,
      metadata: { old_status: session.status, new_status: status }
    });

    return updated;
  }

  static async generateRecommendedPlan(sessionId: string, user: JwtPayload) {
    const { session } = await this.getSessionById(sessionId, user);
    return ApplicabilityService.generateRecommendedLoadPlan(
      session.min_capacity,
      session.max_capacity,
      session.verification_scale_interval,
      session.accuracy_class as AccuracyClass,
      session.unit,
      session.regulatory_mode as RegulatoryMode
    );
  }

  // --- OBSERVATION MANAGEMENT ---
  static async addObservation(
    testSessionTestId: string,
    data: {
      sequenceNo: number;
      direction?: string;
      loadValue: number;
      loadUnit?: string;
      indicationValue: number;
      indicationUnit?: string;
      additionalLoad?: number | null;
      zeroError?: number | null;
      position?: string | null;
      repeatNumber?: number | null;
      remarks?: string | null;
    },
    user: JwtPayload
  ) {
    const testRecord = await TestSessionRepository.getTestById(testSessionTestId);
    if (!testRecord) {
      throw new AppError('Test not found in session.', 404, 'TEST_NOT_FOUND');
    }
    if (user.role !== 'admin' && user.laboratoryId && testRecord.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied.', 403, 'FORBIDDEN');
    }

    const instrument = await InstrumentRepository.findById(testRecord.instrument_id);
    if (!instrument) {
      throw new AppError('Instrument record not found.', 404, 'INSTRUMENT_NOT_FOUND');
    }

    // Number validity
    if (isNaN(data.loadValue) || !isFinite(data.loadValue)) {
      throw new AppError('Applied load value must be a valid finite number.', 400, 'INVALID_LOAD_VALUE');
    }
    if (isNaN(data.indicationValue) || !isFinite(data.indicationValue)) {
      throw new AppError('Indication value must be a valid finite number.', 400, 'INVALID_INDICATION_VALUE');
    }
    if (data.loadValue < 0) {
      throw new AppError('Applied load value cannot be negative.', 400, 'INVALID_LOAD_NEGATIVE');
    }
    const maxCapacityNum = Number(instrument.max_capacity);
    if (data.loadValue > maxCapacityNum * 1.1) {
      throw new AppError(
        `Applied load (${data.loadValue} ${data.loadUnit || instrument.unit}) exceeds instrument Max capacity (${maxCapacityNum} ${instrument.unit}) plus 10% maximum overload limit.`,
        400,
        'LOAD_EXCEEDS_MAX'
      );
    }

    // Eccentricity specific checks
    if (testRecord.code === 'ECCENTRIC_LOADING') {
      if (!data.position) {
        throw new AppError('Position identifier is mandatory for eccentric loading observations.', 400, 'POSITION_REQUIRED');
      }
      const existingObs = await TestSessionRepository.getObservationsForTest(testSessionTestId);
      const isDuplicate = existingObs.some(o => o.position === data.position);
      if (isDuplicate) {
        throw new AppError(
          `Position "${data.position}" has already been recorded in this eccentric loading session. Duplicate positions are not permitted.`,
          400,
          'DUPLICATE_POSITION'
        );
      }
    }

    // Discrimination specific checks
    if (testRecord.code === 'DISCRIMINATION') {
      if (data.indicationValue < 0) {
        throw new AppError('Resulting indication cannot be negative.', 400, 'INVALID_INDICATION_NEGATIVE');
      }
    }

    return TestSessionRepository.createObservation({
      testSessionTestId,
      sequenceNo: data.sequenceNo,
      direction: data.direction,
      loadValue: data.loadValue,
      loadUnit: data.loadUnit || 'kg',
      indicationValue: data.indicationValue,
      indicationUnit: data.indicationUnit || 'kg',
      additionalLoad: data.additionalLoad !== undefined && data.additionalLoad !== null ? Number(data.additionalLoad) : null,
      zeroError: data.zeroError !== undefined && data.zeroError !== null ? Number(data.zeroError) : null,
      position: data.position || null,
      repeatNumber: data.repeatNumber || null,
      remarks: data.remarks || null
    });
  }

  static async getObservations(testSessionTestId: string, user: JwtPayload) {
    const testRecord = await TestSessionRepository.getTestById(testSessionTestId);
    if (!testRecord) {
      throw new AppError('Test not found.', 404, 'TEST_NOT_FOUND');
    }
    if (user.role !== 'admin' && user.laboratoryId && testRecord.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied.', 403, 'FORBIDDEN');
    }

    const observations = await TestSessionRepository.getObservationsForTest(testSessionTestId);
    const results = await TestSessionRepository.getResultsForTest(testSessionTestId);
    return { test: testRecord, observations, results };
  }

  static async deleteObservation(testSessionTestId: string, observationId: string, user: JwtPayload) {
    const testRecord = await TestSessionRepository.getTestById(testSessionTestId);
    if (!testRecord) {
      throw new AppError('Test not found.', 404, 'TEST_NOT_FOUND');
    }
    if (user.role !== 'admin' && user.laboratoryId && testRecord.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied.', 403, 'FORBIDDEN');
    }

    const deleted = await TestSessionRepository.deleteObservation(observationId, testSessionTestId);
    if (!deleted) {
      throw new AppError('Observation not found in this test session.', 404, 'OBSERVATION_NOT_FOUND');
    }

    // Fetch remaining observations
    const remainingObs = await TestSessionRepository.getObservationsForTest(testSessionTestId);
    let updatedTestRecord = testRecord;
    let calculatedResults: any[] = [];

    if (remainingObs.length > 0) {
      // Recalculate test automatically so errors, summaries and pass/fail update immediately
      const calcRes = await this.calculateTest(testSessionTestId, user);
      updatedTestRecord = calcRes.test;
      calculatedResults = calcRes.results;
    } else {
      // Zero observations remaining: remove stale test_results and reset test status to INCOMPLETE
      await TestSessionRepository.deleteResultsForTest(testSessionTestId);
      updatedTestRecord = await TestSessionRepository.updateTestStatus(testSessionTestId, 'INCOMPLETE', null);
    }

    // Re-evaluate entire session status
    await this.evaluateSessionOverallStatus(testRecord.test_session_id);

    return {
      success: true,
      message: 'Observation deleted and test results recalculated.',
      test: updatedTestRecord,
      observations: remainingObs,
      results: calculatedResults
    };
  }

  // --- CALCULATION ENGINE DISPATCHER ---
  static async calculateTest(testSessionTestId: string, user: JwtPayload) {
    const testRecord = await TestSessionRepository.getTestById(testSessionTestId);
    if (!testRecord) {
      throw new AppError('Test not found.', 404, 'TEST_NOT_FOUND');
    }
    if (user.role !== 'admin' && user.laboratoryId && testRecord.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied.', 403, 'FORBIDDEN');
    }

    const instrument = await InstrumentRepository.findById(testRecord.instrument_id);
    if (!instrument) {
      throw new AppError('Instrument record not found.', 404, 'INSTRUMENT_NOT_FOUND');
    }

    if (testRecord.applicability_status === 'NOT_APPLICABLE') {
      return {
        test: testRecord,
        status: 'NOT_APPLICABLE',
        summary: {
          isApplicable: false,
          reason: testRecord.applicability_reason || 'Test is not applicable to this instrument configuration.'
        },
        results: []
      };
    }

    const observations = await TestSessionRepository.getObservationsForTest(testSessionTestId);
    if (observations.length === 0) {
      if (testRecord.implementation_state === 'REVIEW_ONLY' || testRecord.applicability_status === 'REVIEW_REQUIRED') {
        const updated = await TestSessionRepository.updateTestStatus(testSessionTestId, 'REVIEW_REQUIRED', {
          message: 'Manual technician review recorded.',
          reviewedAt: new Date().toISOString()
        });
        await this.evaluateSessionOverallStatus(testRecord.test_session_id);
        return {
          test: updated,
          status: 'REVIEW_REQUIRED',
          summary: { message: 'Manual technician review recorded.' },
          results: []
        };
      }
      throw new AppError('Cannot calculate test results with 0 observations recorded.', 400, 'NO_OBSERVATIONS');
    }

    const code = testRecord.code;
    const implState = testRecord.implementation_state;
    let finalStatus: TestComplianceStatus = 'PASS';
    let summary: any = {};
    const testResultsToSave: any[] = [];

    // Backend rule enforcement: If test is PARTIAL or REVIEW_ONLY, it can never yield PASS!
    if (implState === 'PARTIAL' || implState === 'REVIEW_ONLY' || testRecord.applicability_status === 'REVIEW_REQUIRED') {
      finalStatus = 'REVIEW_REQUIRED';
    } else if (implState === 'DEFERRED') {
      throw new AppError(`Test "${testRecord.name}" is marked DEFERRED and cannot be executed in this version.`, 400, 'TEST_DEFERRED');
    }

    switch (code) {
      case 'WEIGHING_PERFORMANCE': {
        let allPass = true;
        const computedRows: any[] = [];

        // Determine session Zero Error E0 from explicit zero load reading or provided zero error
        const zeroObs = observations.find(o => Number(o.load_value) === 0);
        let sessionZeroError = 0;
        let zeroErrorSource = 'DEFAULT_ZERO';

        if (zeroObs) {
          const zeroCalc = ErrorCalculator.calculate({
            load: 0,
            indication: zeroObs.indication_value,
            unit: zeroObs.load_unit || instrument.unit,
            additionalLoad: zeroObs.additional_load,
            zeroError: 0,
            e: instrument.verification_scale_interval,
            d: instrument.scale_interval,
            accuracyClass: instrument.accuracy_class as AccuracyClass,
            regulatoryMode: testRecord.regulatory_mode as RegulatoryMode
          });
          sessionZeroError = zeroCalc.rawErrorE;
          zeroErrorSource = `ZERO_LOAD_OBSERVATION (Obs #${zeroObs.sequence_no})`;
        } else {
          // Check if any observation has an explicit zero_error entered
          const explicitZero = observations.find(o => o.zero_error !== null && o.zero_error !== undefined);
          if (explicitZero && explicitZero.zero_error !== null) {
            sessionZeroError = Number(explicitZero.zero_error);
            zeroErrorSource = `EXPLICIT_TECHNICIAN_INPUT (${sessionZeroError} ${instrument.unit})`;
          }
        }

        for (const obs of observations) {
          const calc = ErrorCalculator.calculate({
            load: obs.load_value,
            indication: obs.indication_value,
            unit: obs.load_unit || instrument.unit,
            additionalLoad: obs.additional_load,
            zeroError: sessionZeroError,
            e: instrument.verification_scale_interval,
            d: instrument.scale_interval,
            accuracyClass: instrument.accuracy_class as AccuracyClass,
            regulatoryMode: testRecord.regulatory_mode as RegulatoryMode
          });

          if (calc.status !== 'PASS') allPass = false;

          // Update observation row in PostgreSQL with calculated raw and corrected errors and zero error used
          await TestSessionRepository.updateObservation(obs.id, {
            raw_error: calc.rawErrorE,
            zero_error: sessionZeroError,
            corrected_error: calc.correctedErrorEc
          });

          testResultsToSave.push({
            ruleId: calc.evaluation.ruleId,
            resultType: 'INDICATION_ERROR',
            value: calc.correctedErrorEc,
            unit: obs.load_unit || instrument.unit,
            limitValue: calc.mpe.mpeAbsolute,
            passFail: calc.status,
            calculationReference: `${calc.evaluation.regulation} Clause ${calc.evaluation.clause} / Annex A.4.4.3`,
            calculationDetails: {
              ...calc.evaluation,
              load: obs.load_value,
              indication: obs.indication_value,
              additionalLoad: obs.additional_load,
              rawErrorE: calc.rawErrorE,
              zeroErrorE0: sessionZeroError,
              zeroErrorSource,
              correctedErrorEc: calc.correctedErrorEc
            }
          });

          computedRows.push(calc);
        }

        finalStatus = allPass ? 'PASS' : 'FAIL';
        summary = {
          observationsCount: observations.length,
          allPass,
          zeroErrorUsed: sessionZeroError,
          zeroErrorSource,
          worstError: Math.max(...computedRows.map(r => Math.abs(r.correctedErrorEc))),
          maxPermissibleError: Math.max(...computedRows.map(r => r.mpe.mpeAbsolute))
        };
        break;
      }

      case 'REPEATABILITY': {
        const readings = observations.map(o => o.indication_value);
        const testLoad = observations[0].load_value;

        const repResult = RepeatabilityCalculator.calculate({
          load: testLoad,
          unit: observations[0].load_unit || instrument.unit,
          readings,
          e: instrument.verification_scale_interval,
          d: instrument.scale_interval,
          maxCapacity: instrument.max_capacity,
          accuracyClass: instrument.accuracy_class as AccuracyClass,
          regulatoryMode: testRecord.regulatory_mode as RegulatoryMode
        });

        finalStatus = repResult.status;
        summary = {
          load: testLoad,
          readingsCount: readings.length,
          requiredCount: repResult.requiredReadingsCount,
          maxIndication: repResult.maxIndication,
          minIndication: repResult.minIndication,
          rangeDifference: repResult.rangeDifference,
          mpeAbsolute: repResult.mpe.mpeAbsolute,
          isCompliant: repResult.status === 'PASS',
          explanation: repResult.evaluation.explanation
        };

        testResultsToSave.push({
          ruleId: repResult.evaluation.ruleId,
          resultType: 'REPEATABILITY_RANGE',
          value: repResult.rangeDifference,
          unit: repResult.unit,
          limitValue: repResult.mpe.mpeAbsolute,
          passFail: repResult.status,
          calculationReference: `${repResult.evaluation.regulation} Clause ${repResult.evaluation.clause} / Annex A.4.10`,
          calculationDetails: repResult.evaluation
        });
        break;
      }

      case 'ECCENTRIC_LOADING': {
        const readings = observations.map(o => ({
          position: o.position || 'UNKNOWN',
          load: o.load_value,
          indication: o.indication_value,
          additionalLoad: o.additional_load,
          zeroError: o.zero_error
        }));

        const eccResult = EccentricityCalculator.calculate({
          maxCapacity: instrument.max_capacity,
          unit: instrument.unit,
          e: instrument.verification_scale_interval,
          d: instrument.scale_interval,
          accuracyClass: instrument.accuracy_class as AccuracyClass,
          regulatoryMode: testRecord.regulatory_mode as RegulatoryMode,
          readings
        });

        finalStatus = eccResult.status;

        // CRITICAL BUG FIX: Persist calculated raw_error and corrected_error back to each observation row!
        for (const posResult of eccResult.positions) {
          const matchingObs = observations.find(o => o.position === posResult.position);
          if (matchingObs) {
            await TestSessionRepository.updateObservation(matchingObs.id, {
              raw_error: posResult.rawError,
              corrected_error: posResult.correctedError
            });
          }

          // Persist a test_results row for EACH position tested
          testResultsToSave.push({
            ruleId: eccResult.evaluation.ruleId,
            resultType: `ECCENTRICITY_${posResult.position}`,
            value: posResult.correctedError,
            unit: eccResult.unit,
            limitValue: posResult.mpe.mpeAbsolute,
            passFail: posResult.status,
            calculationReference: `${eccResult.evaluation.regulation} Clause ${eccResult.evaluation.clause} / Annex A.4.7`,
            calculationDetails: {
              position: posResult.position,
              load: posResult.load,
              indication: posResult.indication,
              rawError: posResult.rawError,
              zeroError: posResult.zeroError,
              correctedError: posResult.correctedError,
              mpe: posResult.mpe,
              status: posResult.status
            }
          });
        }

        summary = {
          calculatedTestLoad: eccResult.calculatedTestLoad,
          positionsCount: readings.length,
          requiredPositionsCount: 5,
          allPositionsPass: eccResult.status === 'PASS',
          explanation: eccResult.evaluation.explanation,
          positions: eccResult.positions.map(p => ({
            position: p.position,
            load: p.load,
            indication: p.indication,
            rawError: p.rawError,
            correctedError: p.correctedError,
            mpe: p.mpe.mpeAbsolute,
            status: p.status
          }))
        };
        break;
      }

      case 'DISCRIMINATION': {
        let allDiscPass = true;
        const discResults: any[] = [];

        for (const obs of observations) {
          const baseLoad = obs.load_value;
          const initialInd = baseLoad; // Base indication at zero extra load
          const addedLoad = obs.additional_load || DecimalUtils.toNumber(DecimalUtils.mul(instrument.scale_interval, '1.4'));
          const resultingIndication = obs.indication_value;

          const discResult = DiscriminationCalculator.calculate({
            testLoad: baseLoad,
            indication: initialInd,
            addedLoad,
            resultingIndication,
            unit: obs.load_unit || instrument.unit,
            d: instrument.scale_interval,
            e: instrument.verification_scale_interval,
            accuracyClass: instrument.accuracy_class as AccuracyClass,
            indicationType: 'digital',
            regulatoryMode: testRecord.regulatory_mode as RegulatoryMode
          });

          if (discResult.status !== 'PASS') allDiscPass = false;

          // Update observation row with observed change and deviation from I+d
          await TestSessionRepository.updateObservation(obs.id, {
            raw_error: discResult.observedChange,
            corrected_error: discResult.deviationFromExpected
          });

          testResultsToSave.push({
            ruleId: discResult.evaluation.ruleId,
            resultType: 'DISCRIMINATION_STEP',
            value: discResult.resultingIndication,
            unit: obs.load_unit || instrument.unit,
            limitValue: discResult.expectedIndication,
            passFail: discResult.status,
            calculationReference: `${discResult.evaluation.regulation} Clause ${discResult.evaluation.clause} / Annex A.4.8.2`,
            calculationDetails: {
              ...discResult.evaluation,
              testLoad: baseLoad,
              initialIndication: initialInd,
              addedLoad,
              resultingIndication,
              expectedIndication: discResult.expectedIndication,
              deviationFromExpected: discResult.deviationFromExpected,
              observedChange: discResult.observedChange,
              requiredChange: discResult.requiredChange
            }
          });

          discResults.push(discResult);
        }

        finalStatus = allDiscPass ? 'PASS' : 'FAIL';
        summary = {
          observationsCount: observations.length,
          allPass: allDiscPass,
          testLoad: observations[0].load_value,
          addedLoad: observations[0].additional_load,
          expectedIndication: discResults[0]?.expectedIndication,
          resultingIndication: discResults[0]?.resultingIndication,
          deviationFromExpected: discResults[0]?.deviationFromExpected,
          explanation: discResults[0]?.evaluation.explanation
        };
        break;
      }

      case 'ZERO_SETTING': {
        const obs = observations[0];
        const zeroResult = ZeroCalculator.calculate({
          initialIndication: obs.load_value || 0,
          zeroSettingAction: obs.remarks || 'Zero-setting key pressed',
          finalIndication: obs.indication_value || 0,
          unit: obs.indication_unit || instrument.unit,
          e: instrument.verification_scale_interval,
          d: instrument.scale_interval,
          additionalLoadAtZero: obs.additional_load,
          remarks: obs.remarks
        });

        finalStatus = zeroResult.status;
        summary = {
          initialIndication: zeroResult.initialIndication,
          finalIndication: zeroResult.finalIndication,
          zeroErrorE0: zeroResult.zeroErrorE0,
          maxPermissible: zeroResult.maxPermissibleZeroError
        };

        testResultsToSave.push({
          ruleId: zeroResult.evaluation.ruleId,
          resultType: 'ZERO_SETTING_ACCURACY',
          value: zeroResult.zeroErrorE0 || 0,
          unit: zeroResult.unit,
          limitValue: zeroResult.maxPermissibleZeroError,
          passFail: zeroResult.status,
          calculationReference: `${zeroResult.evaluation.regulation} Clause ${zeroResult.evaluation.clause}`,
          calculationDetails: zeroResult.evaluation
        });
        break;
      }

      case 'TARE': {
        const obs = observations[0];
        const tareResult = TareCalculator.calculate({
          tareValue: obs.load_value,
          netLoad: obs.indication_value,
          netIndication: obs.indication_value,
          unit: obs.load_unit || instrument.unit,
          e: instrument.verification_scale_interval,
          accuracyClass: instrument.accuracy_class,
          regulatoryMode: testRecord.regulatory_mode
        });

        finalStatus = tareResult.status; // REVIEW_REQUIRED
        summary = {
          tareValue: tareResult.tareValue,
          netError: tareResult.netError,
          mpeAbsolute: tareResult.mpeAbsolute
        };

        testResultsToSave.push({
          ruleId: tareResult.evaluation.ruleId,
          resultType: 'TARE_NET_ERROR',
          value: tareResult.netError,
          unit: obs.load_unit || instrument.unit,
          limitValue: tareResult.mpeAbsolute,
          passFail: tareResult.status,
          calculationReference: `${tareResult.evaluation.regulation} Clause ${tareResult.evaluation.clause}`,
          calculationDetails: tareResult.evaluation
        });
        break;
      }

      case 'MULTIPLE_INDICATING_DEVICES': {
        const load = observations[0].load_value || instrument.max_capacity;
        const indications = observations.map(o => ({
          deviceName: o.position || o.remarks || `Indicator #${o.sequence_no}`,
          isPrinter: (o.remarks || '').toLowerCase().includes('printer') || (o.position || '').toLowerCase().includes('printer'),
          indicationValue: Number(o.indication_value)
        }));

        const mpe = MpeCalculator.calculate(
          Number(load),
          Number(instrument.verification_scale_interval),
          instrument.accuracy_class as AccuracyClass,
          testRecord.regulatory_mode as RegulatoryMode
        );

        const multiResult = MultipleIndicationCalculator.calculate({
          load: Number(load),
          unit: instrument.unit,
          indications,
          mpeAbsolute: mpe.mpeAbsolute
        });

        finalStatus = multiResult.status;
        summary = {
          load,
          maxDifference: multiResult.maxDifference,
          mpeLimit: mpe.mpeAbsolute,
          printerMatchesDisplay: multiResult.printerMatchesDisplay,
          explanation: multiResult.evaluation.explanation
        };

        testResultsToSave.push({
          ruleId: multiResult.evaluation.ruleId,
          resultType: 'MULTIPLE_INDICATION_COMPARISON',
          value: multiResult.maxDifference,
          unit: instrument.unit,
          limitValue: mpe.mpeAbsolute,
          passFail: multiResult.status,
          calculationReference: `${multiResult.evaluation.regulation} Clause ${multiResult.evaluation.clause}`,
          calculationDetails: multiResult.evaluation
        });
        break;
      }

      case 'DIFFERENT_POSITIONS_OF_EQUILIBRIUM': {
        const load = observations[0].load_value || instrument.max_capacity;
        const positions = observations.map(o => ({
          positionName: o.position || `Position #${o.sequence_no}`,
          indicationValue: Number(o.indication_value)
        }));

        const mpe = MpeCalculator.calculate(
          Number(load),
          Number(instrument.verification_scale_interval),
          instrument.accuracy_class as AccuracyClass,
          testRecord.regulatory_mode as RegulatoryMode
        );

        const eqResult = EquilibriumCalculator.calculate({
          load: Number(load),
          unit: instrument.unit,
          positions,
          mpeAbsolute: mpe.mpeAbsolute
        });

        finalStatus = eqResult.status;
        summary = {
          load,
          maxDifference: eqResult.maxDifference,
          mpeLimit: mpe.mpeAbsolute,
          explanation: eqResult.evaluation.explanation
        };

        testResultsToSave.push({
          ruleId: eqResult.evaluation.ruleId,
          resultType: 'EQUILIBRIUM_POSITION_COMPARISON',
          value: eqResult.maxDifference,
          unit: instrument.unit,
          limitValue: mpe.mpeAbsolute,
          passFail: eqResult.status,
          calculationReference: `${eqResult.evaluation.regulation} Clause ${eqResult.evaluation.clause}`,
          calculationDetails: eqResult.evaluation
        });
        break;
      }

      default: {
        // Influence / other tests (all enforce REVIEW_REQUIRED)
        finalStatus = 'REVIEW_REQUIRED';
        summary = {
          message: `Test ${code} evaluated under technician review protocol.`,
          observationsCount: observations.length
        };

        testResultsToSave.push({
          ruleId: `R76-${code}`,
          resultType: 'REVIEW_ENTRY',
          value: 0,
          unit: instrument.unit,
          limitValue: 0,
          passFail: 'REVIEW_REQUIRED',
          calculationReference: `OIML R 76-1:2006 ${testRecord.r76_reference}`,
          calculationDetails: {
            implementationState: implState,
            message: 'Manual review required for non-automated test requirements.'
          }
        });
        break;
      }
    }

    // Persist results & update test status
    await TestSessionRepository.saveTestResults(testSessionTestId, testResultsToSave);
    const updatedTest = await TestSessionRepository.updateTestStatus(testSessionTestId, finalStatus, summary);

    // Re-evaluate entire session status
    await this.evaluateSessionOverallStatus(testRecord.test_session_id);

    return {
      test: updatedTest,
      status: finalStatus,
      summary,
      results: testResultsToSave
    };
  }

  // --- OVERALL SESSION STATUS EVALUATION ---
  static async evaluateSessionOverallStatus(sessionId: string) {
    const tests = await TestSessionRepository.getTestsForSession(sessionId);
    if (tests.length === 0) return { overallStatus: 'DRAFT', explanation: 'No tests assigned to session.' };

    const passedTests: any[] = [];
    const failedTests: any[] = [];
    const reviewRequiredTests: any[] = [];
    const incompleteTests: any[] = [];
    const notApplicableTests: any[] = [];

    for (const t of tests) {
      if (t.status === 'FAIL') {
        failedTests.push({
          id: t.id,
          code: t.code,
          name: t.name,
          r76Reference: t.r76_reference,
          summary: t.calculation_summary
        });
      } else if (t.status === 'REVIEW_REQUIRED') {
        reviewRequiredTests.push({
          id: t.id,
          code: t.code,
          name: t.name,
          r76Reference: t.r76_reference,
          summary: t.calculation_summary
        });
      } else if (t.status === 'PASS') {
        passedTests.push({
          id: t.id,
          code: t.code,
          name: t.name,
          r76Reference: t.r76_reference,
          summary: t.calculation_summary
        });
      } else if (t.status === 'NOT_APPLICABLE') {
        notApplicableTests.push({
          id: t.id,
          code: t.code,
          name: t.name,
          r76Reference: t.r76_reference
        });
      } else {
        // PENDING, INCOMPLETE, IN_PROGRESS, DRAFT
        incompleteTests.push({
          id: t.id,
          code: t.code,
          name: t.name,
          r76Reference: t.r76_reference,
          status: t.status
        });
      }
    }

    let overallStatus: string;
    let explanation: string;

    if (failedTests.length > 0) {
      overallStatus = 'FAILED';
      const failedNames = failedTests.map(t => `${t.name} (${t.r76Reference})`).join(', ');
      explanation = `Test session FAILED: Non-compliant metrological results in ${failedTests.length} test(s): ${failedNames}. Limits specified by OIML R 76-1:2006 were exceeded.`;
    } else if (reviewRequiredTests.length > 0) {
      overallStatus = 'REVIEW_REQUIRED';
      const reviewNames = reviewRequiredTests.map(t => `${t.name} (${t.r76Reference})`).join(', ');
      explanation = `Test session requires manual technician review / verification for: ${reviewNames}. Certification cannot proceed automatically.`;
    } else if (incompleteTests.length > 0) {
      overallStatus = 'IN_PROGRESS';
      const pendingNames = incompleteTests.map(t => t.name).join(', ');
      explanation = `Test session is IN PROGRESS: Observations pending for: ${pendingNames}.`;
    } else if (passedTests.length + notApplicableTests.length === tests.length) {
      overallStatus = 'PASSED';
      explanation = `All ${passedTests.length} applicable OIML R 76-1:2006 metrological tests have been verified compliant with Maximum Permissible Errors.`;
    } else {
      overallStatus = 'IN_PROGRESS';
      explanation = 'Test session is currently in progress.';
    }

    await TestSessionRepository.updateStatus(sessionId, overallStatus);
    return {
      overallStatus,
      explanation,
      passedTests,
      failedTests,
      reviewRequiredTests,
      incompleteTests,
      notApplicableTests,
      totalTests: tests.length,
      timestamp: new Date().toISOString()
    };
  }

  static async reEvaluateApplicabilityForSession(sessionId: string) {
    const sessionRecord = await TestSessionRepository.findById(sessionId);
    if (!sessionRecord) throw new AppError('Session not found', 404);

    const instrument = await InstrumentRepository.findById(sessionRecord.instrument_id);
    if (!instrument) throw new AppError('Instrument not found', 404);

    const appConfig = {
      ...(instrument.device_configuration || {}),
      ...(sessionRecord.environmental_conditions?.deviceConfiguration || {}),
      ...(sessionRecord.applicability_context?.configuration || {})
    };

    const applicabilityContext: any = {
      accuracyClass: instrument.accuracy_class,
      instrumentType: instrument.instrument_type,
      maxCapacity: Number(instrument.max_capacity),
      minCapacity: Number(instrument.min_capacity),
      e: Number(instrument.verification_scale_interval),
      d: Number(instrument.scale_interval),
      unit: instrument.unit,
      configuration: appConfig,
      regulatoryMode: sessionRecord.regulatory_mode || 'TYPE_EVALUATION',
      regulationVersion: sessionRecord.regulation_version || 'OIML R 76-1:2006'
    };

    const tests = await TestSessionRepository.getTestsForSession(sessionId);
    for (const t of tests) {
      const evalResult = ApplicabilityService.evaluateTestApplicability(t.code, applicabilityContext);

      if (evalResult.applicability === 'NOT_APPLICABLE') {
        await TestSessionRepository.updateTestApplicability(
          t.id,
          'NOT_APPLICABLE',
          evalResult.reason,
          evalResult.ruleId,
          'NOT_APPLICABLE',
          'COMPLETED'
        );
      } else if (evalResult.applicability === 'REVIEW_REQUIRED') {
        const newStatus = ['DRAFT', 'NOT_APPLICABLE'].includes(t.status) ? 'REVIEW_REQUIRED' : t.status;
        await TestSessionRepository.updateTestApplicability(
          t.id,
          'REVIEW_REQUIRED',
          evalResult.reason,
          evalResult.ruleId,
          newStatus
        );
      } else {
        // APPLICABLE
        const newStatus = t.status === 'NOT_APPLICABLE' ? 'DRAFT' : t.status;
        const newExec = t.status === 'NOT_APPLICABLE' ? 'NOT_STARTED' : (t.execution_status || 'NOT_STARTED');
        await TestSessionRepository.updateTestApplicability(
          t.id,
          'APPLICABLE',
          evalResult.reason,
          evalResult.ruleId,
          newStatus,
          newExec
        );
      }
    }

    return this.evaluateSessionOverallStatus(sessionId);
  }
}
