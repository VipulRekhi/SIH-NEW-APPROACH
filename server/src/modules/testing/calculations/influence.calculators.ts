import { RuleEvaluationResult, TestComplianceStatus } from './calculation.types.js';

export class InfluenceCalculators {
  static evaluateTilting(input: {
    longitudinalTiltAngle?: number;
    transverseTiltAngle?: number;
    loadedIndication: number;
    testLoad: number;
    unit: string;
    remarks?: string;
  }): { status: TestComplianceStatus; evaluation: RuleEvaluationResult } {
    return {
      status: 'REVIEW_REQUIRED',
      evaluation: {
        ruleId: 'R76-3.9.1-A.5.1',
        regulation: 'OIML R 76-1',
        edition: '2006',
        clause: '3.9.1',
        annexClause: 'A.5.1',
        inputs: input,
        intermediateValues: {},
        formula: 'Error under operational tilt limit <= |MPE|',
        limit: { requirement: 'Instrument remains within MPE when tilted to marked or 1/1000 limit' },
        result: { implementationState: 'PARTIAL' },
        status: 'REVIEW_REQUIRED',
        explanation: 'Tilting influence test observation recorded. Technician review required to verify physical level indicator limits and environmental stabilization.'
      }
    };
  }

  static evaluateTemperature(input: {
    testTemperature: number;
    testLoad: number;
    indication: number;
    unit: string;
    markedRange?: string;
  }): { status: TestComplianceStatus; evaluation: RuleEvaluationResult } {
    return {
      status: 'REVIEW_REQUIRED',
      evaluation: {
        ruleId: 'R76-3.9.2-A.5.3',
        regulation: 'OIML R 76-1',
        edition: '2006',
        clause: '3.9.2',
        annexClause: 'A.5.3',
        inputs: input,
        intermediateValues: {},
        formula: 'Static temperature test: -10 deg C to +40 deg C; error <= |MPE|',
        limit: { requirement: 'Weighing error within MPE at temperature extremes' },
        result: { implementationState: 'PARTIAL' },
        status: 'REVIEW_REQUIRED',
        explanation: 'Temperature observation recorded. Climatic chamber calibration and temperature stabilization require technician inspection.'
      }
    };
  }

  static evaluateWarmup(input: {
    timeMinutes: number;
    initialZeroIndication: number;
    loadedIndication: number;
    testLoad: number;
    unit: string;
  }): { status: TestComplianceStatus; evaluation: RuleEvaluationResult } {
    return {
      status: 'REVIEW_REQUIRED',
      evaluation: {
        ruleId: 'R76-3.9.3-A.5.2',
        regulation: 'OIML R 76-1',
        edition: '2006',
        clause: '3.9.3',
        annexClause: 'A.5.2',
        inputs: input,
        intermediateValues: {},
        formula: 'Warm-up zero drift and indication stability over 5, 15, 30 min',
        limit: { requirement: 'Zero error <= 0.25e after warm-up period' },
        result: { implementationState: 'PARTIAL' },
        status: 'REVIEW_REQUIRED',
        explanation: 'Warm-up observations recorded. Verification of complete pre-test power disconnection series requires technician review.'
      }
    };
  }

  static evaluateCreep(input: {
    loadAtMax: number;
    indicationsSeries: { minute: number; indication: number }[];
    unit: string;
  }): { status: TestComplianceStatus; evaluation: RuleEvaluationResult } {
    return {
      status: 'REVIEW_REQUIRED',
      evaluation: {
        ruleId: 'R76-3.9.4-A.5.4',
        regulation: 'OIML R 76-1',
        edition: '2006',
        clause: '3.9.4',
        annexClause: 'A.5.4',
        inputs: input,
        intermediateValues: {},
        formula: 'Creep indication difference over 30 min <= 0.5e (between 15 min and 30 min <= 0.2e)',
        limit: { requirement: 'Max creep drift <= 0.5e' },
        result: { implementationState: 'PARTIAL' },
        status: 'REVIEW_REQUIRED',
        explanation: 'Creep test observations recorded. Full 30-minute time-series analysis requires technician validation.'
      }
    };
  }

  static evaluateZeroReturn(input: {
    initialZero: number;
    zeroAfterUnloading: number;
    unit: string;
    e: number;
  }): { status: TestComplianceStatus; evaluation: RuleEvaluationResult } {
    return {
      status: 'REVIEW_REQUIRED',
      evaluation: {
        ruleId: 'R76-A.4.11',
        regulation: 'OIML R 76-1',
        edition: '2006',
        clause: '3.9.4',
        annexClause: 'A.4.11',
        inputs: input,
        intermediateValues: {},
        formula: '|Zero_after_unloading - Initial_zero| <= 0.5e',
        limit: { requirement: 'Zero return deviation <= 0.5e' },
        result: { implementationState: 'PARTIAL' },
        status: 'REVIEW_REQUIRED',
        explanation: 'Zero return deviation recorded. Verification of complete unloading cycle requires technician sign-off.'
      }
    };
  }
}
