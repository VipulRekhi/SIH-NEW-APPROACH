import { query } from '../config/db.js';
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
import { DecimalUtils } from '../modules/testing/calculations/decimal.utils.js';

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
    filter: {
      status?: string;
      workflowStatus?: string;
      createdBy?: string;
      instrumentId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
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
    const { session } = await this.getSessionById(sessionId, user);
    if (user.role === 'technician' && ['SUBMITTED_FOR_REVIEW', 'APPROVED', 'OFFICIAL_REPORT_GENERATED'].includes(session.workflow_status)) {
      throw new AppError(
        `Session parameters cannot be modified while in "${session.workflow_status}" status. Observations and metadata are locked for review.`,
        403,
        'SESSION_LOCKED'
      );
    }
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

    const session = await TestSessionRepository.findById(testRecord.test_session_id);
    if (session && user.role === 'technician' && ['SUBMITTED_FOR_REVIEW', 'APPROVED', 'OFFICIAL_REPORT_GENERATED'].includes(session.workflow_status)) {
      throw new AppError(
        `Test session observations are locked against modification while in "${session.workflow_status}" status. If corrections are required, an Officer must return the session to the technician.`,
        403,
        'SESSION_LOCKED'
      );
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

    const obs = await TestSessionRepository.createObservation({
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

    try {
      const { ReportService } = await import('./report.service.js');
      await ReportService.invalidateAndSyncReport(testRecord.test_session_id);
    } catch {
      // Ignore during bootstrap
    }

    return obs;
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

    const session = await TestSessionRepository.findById(testRecord.test_session_id);
    if (session && user.role === 'technician' && ['SUBMITTED_FOR_REVIEW', 'APPROVED', 'OFFICIAL_REPORT_GENERATED'].includes(session.workflow_status)) {
      throw new AppError(
        `Cannot delete observations from a test session in "${session.workflow_status}" status. Observations are locked for review.`,
        403,
        'SESSION_LOCKED'
      );
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

    try {
      const { ReportService } = await import('./report.service.js');
      await ReportService.invalidateAndSyncReport(testRecord.test_session_id);
    } catch {
      // Ignore during bootstrap
    }

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
        const normalizePos = (posStr: string | null | undefined): string => {
          if (!posStr) return 'CENTER';
          let p = posStr.toUpperCase().trim().replace(/[- ]+/g, '_');
          if (p === 'BACK_LEFT') p = 'REAR_LEFT';
          if (p === 'BACK_RIGHT') p = 'REAR_RIGHT';
          return p;
        };

        const readings = observations.map(o => ({
          position: normalizePos(o.position),
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

        // CRITICAL: Persist calculated raw_error and corrected_error back to each observation row
        for (let i = 0; i < observations.length; i++) {
          const obs = observations[i];
          const obsNormPos = normalizePos(obs.position);
          const posResult = eccResult.positions.find(p => p.position === obsNormPos) || eccResult.positions[i];
          if (posResult) {
            await TestSessionRepository.updateObservation(obs.id, {
              raw_error: posResult.rawError,
              corrected_error: posResult.correctedError
            });
            obs.raw_error = posResult.rawError;
            obs.corrected_error = posResult.correctedError;
          }

          if (posResult) {
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
          let initialInd = baseLoad;
          if (obs.raw_input && typeof obs.raw_input === 'object' && obs.raw_input.initialIndication !== undefined) {
            initialInd = Number(obs.raw_input.initialIndication);
          } else if (obs.remarks && obs.remarks.includes('initial=')) {
            const match = obs.remarks.match(/initial=([0-9.]+)/);
            if (match) initialInd = parseFloat(match[1]);
          }

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
          obs.raw_error = discResult.observedChange;
          obs.corrected_error = discResult.deviationFromExpected;

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

        const obs0 = observations[0];
        const obs1 = observations[1] || obs0;
        const eqResult = EquilibriumCalculator.calculate({
          load: Number(load),
          unit: instrument.unit,
          indicationNormal: Number(obs0.indication_value || 0),
          indicationExtended: Number(obs1.indication_value || 0),
          mpeAbsolute: mpe.mpeAbsolute
        });

        finalStatus = eqResult.status;
        summary = {
          load,
          difference: eqResult.difference,
          mpeLimit: mpe.mpeAbsolute,
          explanation: eqResult.evaluation.explanation
        };

        testResultsToSave.push({
          ruleId: eqResult.evaluation.ruleId,
          resultType: 'EQUILIBRIUM_POSITION_COMPARISON',
          value: eqResult.difference,
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

    // Enforce regulatory policy:
    // If the calculation metrologically failed (exceeded MPE), finalStatus is strictly FAIL.
    // If it passed numerical evaluation, but the test is PARTIAL, REVIEW_ONLY, or applicability requires manual review,
    // it cannot yield PASS and must be REVIEW_REQUIRED.
    if (finalStatus === 'PASS' && (implState === 'PARTIAL' || implState === 'REVIEW_ONLY' || testRecord.applicability_status === 'REVIEW_REQUIRED')) {
      finalStatus = 'REVIEW_REQUIRED';
    }

    // Persist results & update test status
    await TestSessionRepository.saveTestResults(testSessionTestId, testResultsToSave);
    const updatedTest = await TestSessionRepository.updateTestStatus(testSessionTestId, finalStatus, summary);

    // Re-evaluate entire session status
    await this.evaluateSessionOverallStatus(testRecord.test_session_id);

    try {
      const { ReportService } = await import('./report.service.js');
      await ReportService.invalidateAndSyncReport(testRecord.test_session_id);
    } catch {
      // Ignore during bootstrap
    }

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
      const isNotApplicable = t.applicability_status === 'NOT_APPLICABLE' || t.status === 'NOT_APPLICABLE';
      if (isNotApplicable) {
        notApplicableTests.push({
          id: t.id,
          code: t.code,
          name: t.name,
          r76Reference: t.r76_reference,
          reason: t.applicability_reason || 'Marked not applicable under verified configuration.'
        });
      } else if (t.status === 'FAIL') {
        let keyEvidence = 'Tolerance limit exceeded';
        let limit = 'MPE Limit';
        let excess = '';

        if (t.code === 'REPEATABILITY' && t.calculation_summary) {
          const deltaI = Number(t.calculation_summary.deltaI ?? 0);
          const mpe = Number(t.calculation_summary.mpe ?? 0);
          keyEvidence = `Delta I = ${deltaI.toFixed(3)} kg`;
          limit = `MPE = +/-${mpe.toFixed(3)} kg`;
          if (deltaI > mpe) {
            excess = `${(deltaI - mpe).toFixed(3)} kg above limit`;
          }
        } else if (t.code === 'WEIGHING_PERFORMANCE' && t.calculation_summary) {
          const maxErr = Number(t.calculation_summary.maxAbsError ?? 0);
          const mpe = Number(t.calculation_summary.maxAllowedMpe ?? 0);
          keyEvidence = `Max |Ec| = ${maxErr.toFixed(3)} kg`;
          limit = `MPE = +/-${mpe.toFixed(3)} kg`;
          if (maxErr > mpe) {
            excess = `${(maxErr - mpe).toFixed(3)} kg above limit`;
          }
        } else if (t.code === 'ECCENTRIC_LOADING' && t.calculation_summary) {
          const maxDev = Number(t.calculation_summary.maxDeviation ?? 0);
          keyEvidence = `Max error = ${maxDev.toFixed(3)} kg`;
          limit = 'MPE at 1/3 Max';
        } else if (t.code === 'DISCRIMINATION' && t.calculation_summary) {
          keyEvidence = 'No response or irregular step';
          limit = '1.4d indication change (I + d)';
        } else if (t.code === 'ZERO_SETTING' && t.calculation_summary) {
          keyEvidence = `Zero Error E0 = ${Number(t.calculation_summary.zeroErrorE0 ?? 0).toFixed(3)} kg`;
          limit = '+/-0.25 e';
        }

        failedTests.push({
          id: t.id,
          code: t.code,
          name: t.name,
          r76Reference: t.r76_reference,
          summary: t.calculation_summary,
          keyEvidence,
          limit,
          excess
        });
      } else if (t.status === 'REVIEW_REQUIRED' || t.applicability_status === 'REVIEW_REQUIRED') {
        reviewRequiredTests.push({
          id: t.id,
          code: t.code,
          name: t.name,
          r76Reference: t.r76_reference,
          summary: t.calculation_summary,
          reason: t.applicability_reason || 'Technician manual inspection required.'
        });
      } else if (t.status === 'PASS') {
        passedTests.push({
          id: t.id,
          code: t.code,
          name: t.name,
          r76Reference: t.r76_reference,
          summary: t.calculation_summary
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

    let overallStatus: 'FAILED' | 'PASSED' | 'REVIEW_REQUIRED' | 'INCOMPLETE';
    let explanation: string;

    // Authoritative Metrological Status Hierarchy (OIML R 76-1:2006):
    // FAIL > INCOMPLETE > REVIEW_REQUIRED > PASS
    if (failedTests.length > 0) {
      overallStatus = 'FAILED';
      const failedNames = failedTests.map(t => `${t.name} (${t.r76Reference}: ${t.keyEvidence})`).join('; ');
      explanation = `Test session FAILED: Non-compliant metrological results in ${failedTests.length} test(s): ${failedNames}. Maximum permissible error limits specified by OIML R 76-1:2006 were exceeded.`;
    } else if (incompleteTests.length > 0) {
      overallStatus = 'INCOMPLETE';
      const pendingNames = incompleteTests.map(t => t.name).join(', ');
      explanation = `Test session is INCOMPLETE: Observations or execution pending for: ${pendingNames}. Certification cannot proceed.`;
    } else if (reviewRequiredTests.length > 0) {
      overallStatus = 'REVIEW_REQUIRED';
      const reviewNames = reviewRequiredTests.map(t => `${t.name} (${t.r76Reference})`).join(', ');
      explanation = `Test session requires manual technician review / qualitative inspection for: ${reviewNames}. Certification cannot proceed automatically.`;
    } else if (passedTests.length > 0 && (passedTests.length + notApplicableTests.length === tests.length)) {
      overallStatus = 'PASSED';
      explanation = `All ${passedTests.length} applicable OIML R 76-1:2006 metrological tests have been verified compliant with Maximum Permissible Errors.`;
    } else {
      overallStatus = 'INCOMPLETE';
      explanation = 'Test session is currently incomplete.';
    }

    let dbStatus = 'IN_PROGRESS';
    if (overallStatus === 'FAILED') dbStatus = 'FAILED';
    else if (overallStatus === 'PASSED') dbStatus = 'PASSED';
    else if (overallStatus === 'REVIEW_REQUIRED') dbStatus = 'REVIEW_REQUIRED';
    else dbStatus = 'IN_PROGRESS';

    await TestSessionRepository.updateStatus(sessionId, dbStatus);

    return {
      sessionId,
      overallStatus,
      explanation,
      applicableTests: tests.filter(t => t.applicability_status !== 'NOT_APPLICABLE' && t.status !== 'NOT_APPLICABLE').map(t => t.code),
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

  /**
   * Deletes an individual test's observations and calculation results from a test session.
   * Resets status to DRAFT, re-evaluates session overall compliance, and synchronizes report data.
   */
  static async deleteTestData(sessionId: string, testSessionTestId: string, user: JwtPayload) {
    const session = await TestSessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Test session not found.', 404, 'SESSION_NOT_FOUND');
    }

    if (user.role !== 'admin' && user.laboratoryId && session.laboratory_id !== user.laboratoryId) {
      throw new AppError('Access denied: You do not have permission for this session.', 403, 'FORBIDDEN');
    }

    if (user.role === 'technician' && ['SUBMITTED_FOR_REVIEW', 'APPROVED', 'OFFICIAL_REPORT_GENERATED'].includes(session.workflow_status)) {
      throw new AppError(
        `Cannot delete test observations for session in "${session.workflow_status}" status. Data is locked.`,
        403,
        'SESSION_LOCKED'
      );
    }

    const testRecord = await TestSessionRepository.getTestById(testSessionTestId);
    if (!testRecord) {
      throw new AppError('Test record not found in session.', 404, 'TEST_NOT_FOUND');
    }

    // 1. Remove observations for this test
    await TestSessionRepository.deleteAllObservationsForTest(testSessionTestId);

    // 2. Remove derived/calculated results for this test
    await TestSessionRepository.deleteResultsForTest(testSessionTestId);

    // 3. Reset test status to DRAFT and execution_status to NOT_STARTED
    await TestSessionRepository.updateTestStatus(testSessionTestId, 'DRAFT', null, 'NOT_STARTED');

    // 4. Invalidate/synchronize any existing report files so stale data is never presented
    try {
      const { ReportService } = await import('./report.service.js');
      await ReportService.syncSessionReportAfterModification(sessionId);
    } catch {
      // Ignore if reports module is initializing
    }

    // 5. Re-evaluate session overall compliance
    const evaluation = await this.evaluateSessionOverallStatus(sessionId);

    // 6. Retrieve refreshed tests for session
    const updatedTests = await TestSessionRepository.getTestsForSession(sessionId);

    return {
      message: `Test observations and results for "${testRecord.name}" have been removed.`,
      testSessionTestId,
      evaluation,
      tests: updatedTests
    };
  }

  // =========================================================================
  // PHASE 5: ROLE-BASED WORKFLOW LIFECYCLE TRANSITIONS
  // =========================================================================

  /**
   * Technician submits completed test session for Officer review.
   */
  static async submitForReview(sessionId: string, user: JwtPayload) {
    const session = await TestSessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Test session not found.', 404, 'SESSION_NOT_FOUND');
    }

    if (user.role !== 'technician' && session.created_by !== user.userId && user.role !== 'admin') {
      throw new AppError('Only the assigned technician can submit test sessions for review.', 403, 'FORBIDDEN');
    }

    if (['SUBMITTED_FOR_REVIEW', 'APPROVED', 'OFFICIAL_REPORT_GENERATED'].includes(session.workflow_status)) {
      throw new AppError(`Session is already in "${session.workflow_status}" status.`, 400, 'INVALID_WORKFLOW_STATE');
    }

    // 1. Validate required instrument information
    const instrument = await InstrumentRepository.findById(session.instrument_id);
    if (!instrument || !instrument.manufacturer || !instrument.model_number || !instrument.serial_number || !instrument.max_capacity) {
      throw new AppError(
        'Cannot submit test session: Verified instrument configuration or technical capacity parameters are incomplete.',
        400,
        'INSTRUMENT_INCOMPLETE'
      );
    }

    // 2. Validate required environmental conditions
    const env = session.environmental_conditions || {};
    if (env.temperature === undefined && env.temp === undefined && !env.temperature_celsius) {
      // If empty environmental conditions
      if (Object.keys(env).length === 0) {
        throw new AppError(
          'Cannot submit test session: Environmental conditions (ambient temperature & relative humidity) must be recorded.',
          400,
          'ENVIRONMENT_INCOMPLETE'
        );
      }
    }

    // 3. Run authoritative compliance evaluation before submission
    const evalRes = await this.evaluateSessionOverallStatus(sessionId);

    // 4. Validate applicable tests completed (no mandatory test is NOT_STARTED or INCOMPLETE)
    if (evalRes.incompleteTests && evalRes.incompleteTests.length > 0) {
      const missingNames = evalRes.incompleteTests.map((t: any) => t.name).join(', ');
      throw new AppError(
        `Cannot submit test session: Mandatory test observations are incomplete for: ${missingNames}. All applicable tests must be completed before submission.`,
        400,
        'TESTS_INCOMPLETE'
      );
    }

    // 5. Validate no unresolved REVIEW_REQUIRED conditions
    if (evalRes.reviewRequiredTests && evalRes.reviewRequiredTests.length > 0) {
      const reviewNames = evalRes.reviewRequiredTests.map((t: any) => t.name).join(', ');
      throw new AppError(
        `Cannot submit test session: Unresolved review-required conditions exist for: ${reviewNames}. Manual technician inspection or configuration resolution is required prior to submission.`,
        400,
        'REVIEW_REQUIRED_UNRESOLVED'
      );
    }

    // 6. Overall engine result must be available
    if (!evalRes.overallStatus || evalRes.overallStatus === 'INCOMPLETE') {
      throw new AppError(
        'Cannot submit test session: Metrological calculation engine has not produced a conclusive evaluation.',
        400,
        'EVALUATION_INCOMPLETE'
      );
    }

    await TestSessionRepository.updateWorkflow(sessionId, {
      workflowStatus: 'SUBMITTED_FOR_REVIEW',
      status: evalRes.overallStatus,
      submittedAt: new Date(),
      submittedBy: user.userId
    });

    await AuditRepository.log({
      userId: user.userId,
      action: 'TEST_SESSION_SUBMITTED_FOR_REVIEW',
      entityType: 'TEST_SESSION',
      entityId: sessionId,
      metadata: {
        session_number: session.session_number,
        technician: user.email,
        overall_status: evalRes.overallStatus
      }
    });

    return this.getSessionById(sessionId, user);
  }

  /**
   * Officer marks test session as currently under inspection.
   */
  static async startReview(sessionId: string, user: JwtPayload) {
    if (user.role !== 'officer' && user.role !== 'admin') {
      throw new AppError('Only authorized Officers can review test sessions.', 403, 'FORBIDDEN');
    }

    const session = await TestSessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Test session not found.', 404, 'SESSION_NOT_FOUND');
    }

    await TestSessionRepository.updateWorkflow(sessionId, {
      workflowStatus: 'UNDER_REVIEW',
      reviewedAt: new Date(),
      reviewedBy: user.userId
    });

    await AuditRepository.log({
      userId: user.userId,
      action: 'TEST_SESSION_UNDER_REVIEW',
      entityType: 'TEST_SESSION',
      entityId: sessionId,
      metadata: {
        session_number: session.session_number,
        officer: user.email
      }
    });

    return this.getSessionById(sessionId, user);
  }

  /**
   * Officer returns test session to technician with correction comments.
   */
  static async returnForCorrection(sessionId: string, comments: string, user: JwtPayload) {
    if (user.role !== 'officer' && user.role !== 'admin') {
      throw new AppError('Only authorized Officers can return test sessions for correction.', 403, 'FORBIDDEN');
    }

    if (!comments || !comments.trim()) {
      throw new AppError('Reviewer comments / instructions for correction are mandatory.', 400, 'COMMENTS_REQUIRED');
    }

    const session = await TestSessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Test session not found.', 404, 'SESSION_NOT_FOUND');
    }

    await TestSessionRepository.updateWorkflow(sessionId, {
      workflowStatus: 'RETURNED_FOR_CORRECTION',
      reviewerComments: comments.trim(),
      returnedAt: new Date(),
      reviewedBy: user.userId
    });

    await AuditRepository.log({
      userId: user.userId,
      action: 'TEST_SESSION_RETURNED_FOR_CORRECTION',
      entityType: 'TEST_SESSION',
      entityId: sessionId,
      metadata: {
        session_number: session.session_number,
        officer: user.email,
        comments: comments.trim()
      }
    });

    return this.getSessionById(sessionId, user);
  }

  /**
   * Officer formally rejects a test session with reason.
   */
  static async rejectSession(sessionId: string, reason: string, user: JwtPayload) {
    if (user.role !== 'officer' && user.role !== 'admin') {
      throw new AppError('Only authorized Officers can reject test sessions.', 403, 'FORBIDDEN');
    }

    if (!reason || !reason.trim()) {
      throw new AppError('A formal rejection reason is mandatory.', 400, 'REASON_REQUIRED');
    }

    const session = await TestSessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Test session not found.', 404, 'SESSION_NOT_FOUND');
    }

    await TestSessionRepository.updateWorkflow(sessionId, {
      workflowStatus: 'REJECTED',
      status: 'FAILED',
      rejectionReason: reason.trim(),
      reviewedAt: new Date(),
      reviewedBy: user.userId
    });

    await AuditRepository.log({
      userId: user.userId,
      action: 'TEST_SESSION_REJECTED',
      entityType: 'TEST_SESSION',
      entityId: sessionId,
      metadata: {
        session_number: session.session_number,
        officer: user.email,
        reason: reason.trim()
      }
    });

    return this.getSessionById(sessionId, user);
  }

  /**
   * Officer approves a test session after authoritative compliance validation.
   * Safety rule: CANNOT approve if any mandatory test is FAIL or REVIEW_REQUIRED.
   */
  static async approveSession(sessionId: string, comments: string | undefined, user: JwtPayload) {
    if (user.role !== 'officer') {
      throw new AppError(
        'Only an authorized Officer has metrological approval authority. Technicians and Administrators cannot act as metrological approving authorities.',
        403,
        'FORBIDDEN'
      );
    }

    const session = await TestSessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Test session not found.', 404, 'SESSION_NOT_FOUND');
    }

    // Authoritative metrological compliance evaluation
    const evalRes = await this.evaluateSessionOverallStatus(sessionId);

    if (evalRes.overallStatus === 'FAILED') {
      throw new AppError(
        `Cannot approve this test session because one or more mandatory applicable tests have FAILED (${evalRes.explanation}). Non-compliant instruments cannot be certified under OIML R 76-1:2006.`,
        400,
        'MANDATORY_TEST_FAILED'
      );
    }

    if (evalRes.overallStatus === 'REVIEW_REQUIRED') {
      throw new AppError(
        `Cannot approve this test session because an applicable test requires manual review (${evalRes.explanation}). All qualitative inspections must be resolved before approval.`,
        400,
        'REVIEW_REQUIRED'
      );
    }

    if (evalRes.overallStatus === 'INCOMPLETE') {
      throw new AppError(
        `Cannot approve this test session because test execution is incomplete (${evalRes.explanation}).`,
        400,
        'TESTS_INCOMPLETE'
      );
    }

    if (evalRes.overallStatus !== 'PASSED') {
      throw new AppError(
        `Cannot approve test session with non-passing compliance status: ${evalRes.overallStatus}.`,
        400,
        'NON_COMPLIANT'
      );
    }

    await TestSessionRepository.updateWorkflow(sessionId, {
      workflowStatus: 'APPROVED',
      status: 'PASSED',
      approvedAt: new Date(),
      approvedBy: user.userId,
      reviewerComments: comments || 'Metrologically verified compliant with OIML R 76-1:2006.'
    });

    await AuditRepository.log({
      userId: user.userId,
      action: 'TEST_SESSION_APPROVED',
      entityType: 'TEST_SESSION',
      entityId: sessionId,
      metadata: {
        session_number: session.session_number,
        officer: user.email,
        compliance: 'PASSED'
      }
    });

    // Generate official verification artifacts upon officer approval
    try {
      const { ReportService } = await import('./report.service.js');
      await ReportService.generateReport(sessionId, user, undefined, true);
    } catch (reportErr) {
      console.error('Failed to generate official report upon session approval:', reportErr);
    }

    return this.getSessionById(sessionId, user);
  }

  /**
   * Deletes an entire test session and cascades cleanup of test items, results, and non-official artifacts.
   * Protects approved official records unless deleted by Admin.
   */
  static async deleteSession(sessionId: string, user: JwtPayload): Promise<void> {
    const session = await TestSessionRepository.findById(sessionId);
    if (!session) {
      throw new AppError('Test session not found.', 404, 'SESSION_NOT_FOUND');
    }

    // Role restrictions:
    // Approved sessions: only admin can delete
    if (['APPROVED', 'OFFICIAL_REPORT_GENERATED'].includes(session.workflow_status) && user.role !== 'admin') {
      throw new AppError(
        'Cannot delete an officially approved test session. Official compliance records are locked. Only an Administrator can perform this deletion.',
        403,
        'FORBIDDEN'
      );
    }

    // Technician role: can only delete own draft, incomplete, or returned sessions
    if (user.role === 'technician') {
      if (session.created_by !== user.userId) {
        throw new AppError('Technicians can only delete their own test sessions.', 403, 'FORBIDDEN');
      }
      if (['SUBMITTED_FOR_REVIEW', 'UNDER_REVIEW'].includes(session.workflow_status)) {
        throw new AppError(
          'Cannot delete a test session that is currently under officer review. It must be returned or rejected first.',
          400,
          'LOCKED_FOR_REVIEW'
        );
      }
    }

    // Cascading deletion:
    // 1. Delete associated reports
    await query('DELETE FROM reports WHERE test_session_id = $1', [sessionId]);

    // 2. Delete test observations
    await query(`
      DELETE FROM test_observations 
      WHERE test_session_test_id IN (
        SELECT id FROM test_session_tests WHERE test_session_id = $1
      )
    `, [sessionId]);

    // 3. Delete test results
    await query(`
      DELETE FROM test_results 
      WHERE test_session_test_id IN (
        SELECT id FROM test_session_tests WHERE test_session_id = $1
      )
    `, [sessionId]);

    // 4. Delete test session tests
    await query('DELETE FROM test_session_tests WHERE test_session_id = $1', [sessionId]);

    // 5. Delete test session
    await query('DELETE FROM test_sessions WHERE id = $1', [sessionId]);

    // Audit log
    await AuditRepository.log({
      userId: user.userId,
      action: 'TEST_SESSION_DELETED',
      entityType: 'TEST_SESSION',
      entityId: sessionId,
      metadata: {
        session_number: session.session_number,
        workflow_status: session.workflow_status,
        deleted_by: user.email
      }
    });
  }
}
