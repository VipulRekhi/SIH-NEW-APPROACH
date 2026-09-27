// applicability.types.ts
// OIML R 76-1:2006 Test Applicability & State Model Types

export type TestImplementationState = 'IMPLEMENTED' | 'PARTIAL' | 'REVIEW_ONLY' | 'DEFERRED';

export type TestApplicabilityStatus = 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED';

export type TestExecutionStatus = 'NOT_STARTED' | 'INCOMPLETE' | 'COMPLETED';

export type TestResultStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'INCOMPLETE'
  | 'PASS'
  | 'FAIL'
  | 'REVIEW_REQUIRED'
  | 'NOT_APPLICABLE';

export type TriState = 'YES' | 'NO' | 'UNKNOWN';

export interface InstrumentConfiguration {
  indicationType?: 'digital' | 'analog' | 'non_self';
  auxiliary_indicating_devices?: TriState | boolean;
  remote_display?: TriState | boolean;
  printer?: TriState | boolean;
  hasMultipleIndicators?: TriState | boolean;
  hasRemoteDisplay?: TriState | boolean;
  hasPrinter?: TriState | boolean;
  hasEquilibriumExtension?: TriState | boolean;
  equilibrium_extension?: TriState | boolean;
  hasTareDevice?: TriState | boolean;
  isTiltSensitive?: TriState | boolean;
  isRollingLoad?: TriState | boolean;
  supportsCount?: number;
  receptorType?: 'PLATFORM' | 'SUSPENDED' | 'TANK_HOPPER' | 'RAIL' | 'OTHER';
  [key: string]: any;
}

export interface InstrumentApplicabilityContext {
  accuracyClass: string;
  instrumentType: string;
  maxCapacity: number;
  minCapacity: number;
  e: number;
  d: number;
  unit: string;
  configuration?: InstrumentConfiguration;
  regulatoryMode?: string;
  regulationVersion?: string;
}

export interface ApplicabilityEvaluationResult {
  testCode: string;
  applicability: TestApplicabilityStatus;
  reason: string;
  ruleId: string;
  clause: string;
}
