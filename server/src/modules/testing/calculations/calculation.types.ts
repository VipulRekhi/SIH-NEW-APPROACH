export type AccuracyClass = 'I' | 'II' | 'III' | 'IIII';

export type RegulatoryMode =
  | 'TYPE_EVALUATION'
  | 'INITIAL_VERIFICATION'
  | 'SUBSEQUENT_VERIFICATION'
  | 'SERVICE_INSPECTION';

export type TestApplicabilityStatus = 'APPLICABLE' | 'NOT_APPLICABLE' | 'REVIEW_REQUIRED';

export type TestExecutionStatus = 'NOT_STARTED' | 'INCOMPLETE' | 'COMPLETED';

export type TestComplianceStatus =
  | 'PASS'
  | 'FAIL'
  | 'REVIEW_REQUIRED'
  | 'NOT_APPLICABLE'
  | 'INCOMPLETE'
  | 'DRAFT'
  | 'IN_PROGRESS';

export type TestImplementationState = 'IMPLEMENTED' | 'PARTIAL' | 'REVIEW_ONLY' | 'DEFERRED';

export interface R76RuleDefinition {
  ruleId: string;
  regulation: string;
  edition: string;
  clause: string;
  annexClause?: string | null;
  title: string;
  ruleType: string;
  formulaDescription: string;
  applicability: Record<string, any>;
  isImplemented: boolean;
}

export interface RuleEvaluationResult {
  ruleId: string;
  regulation: string;
  edition: string;
  clause: string;
  annexClause?: string | null;
  inputs: Record<string, any>;
  intermediateValues: Record<string, any>;
  formula: string;
  limit: Record<string, any>;
  result: Record<string, any>;
  status: TestComplianceStatus;
  explanation: string;
}

export interface MpeResult {
  load: number;
  e: number;
  accuracyClass: AccuracyClass;
  m: number; // m = L / e
  zone: string;
  mpeSigned: number; // e.g. 0.010 kg
  mpeSignedLower: number; // -0.010 kg
  mpeSignedUpper: number; // +0.010 kg
  mpeAbsolute: number; // 0.010 kg
  factorE: number; // e.g. 0.5, 1.0, 1.5, or doubled for service
  regulatoryMode: RegulatoryMode;
  ruleId: string;
  clause: string;
  explanation: string;
}

export interface IndicationErrorInput {
  load: number;
  indication: number;
  unit: string;
  additionalLoad?: number | null; // delta L for turning point
  e: number;
  d: number;
  accuracyClass: AccuracyClass;
  regulatoryMode: RegulatoryMode;
  zeroError?: number | null; // E0
}

export interface IndicationErrorResult {
  load: number;
  indication: number;
  unit: string;
  turningPointP?: number | null;
  rawErrorE: number;
  zeroErrorE0: number;
  correctedErrorEc: number;
  mpe: MpeResult;
  absoluteError: number;
  margin: number; // |MPE| - |Ec|
  status: TestComplianceStatus;
  methodUsed: 'HIGH_RESOLUTION_DISPLAY' | 'CHANGEOVER_POINT_METHOD' | 'DIRECT_INDICATION';
  evaluation: RuleEvaluationResult;
}

export interface RepeatabilityInput {
  load: number;
  unit: string;
  readings: number[];
  e: number;
  d: number;
  maxCapacity: number;
  accuracyClass: AccuracyClass;
  regulatoryMode: RegulatoryMode;
}

export interface RepeatabilityResult {
  load: number;
  unit: string;
  readings: number[];
  maxIndication: number;
  minIndication: number;
  rangeDifference: number; // I_max - I_min
  mpe: MpeResult;
  status: TestComplianceStatus;
  requiredReadingsCount: number;
  providedReadingsCount: number;
  readingsCount: number;
  evaluation: RuleEvaluationResult;
}

export type EccentricSupportCase =
  | 'LESS_OR_EQUAL_4_SUPPORTS'
  | 'MORE_THAN_4_SUPPORTS'
  | 'SPECIAL_MINIMAL_OFF_CENTRE' // tanks, hoppers
  | 'ROLLING_LOAD';

export interface EccentricityPositionReading {
  position: string; // e.g. 'CENTER', 'FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT', 'SUPPORT_1', etc.
  load: number;
  indication: number;
  additionalLoad?: number | null;
  zeroError?: number | null;
}

export interface EccentricityInput {
  supportCase?: EccentricSupportCase;
  supportPointCount?: number;
  maxCapacity: number;
  maxAdditiveTare?: number;
  rollingLoadWeight?: number;
  unit: string;
  e: number;
  d: number;
  accuracyClass: AccuracyClass;
  regulatoryMode: RegulatoryMode;
  readings: EccentricityPositionReading[];
}

export interface EccentricityPositionResult {
  position: string;
  load: number;
  indication: number;
  rawError: number;
  zeroError: number;
  correctedError: number;
  mpe: MpeResult;
  status: TestComplianceStatus;
}

export interface EccentricityResult {
  supportCase: EccentricSupportCase;
  calculatedTestLoad: number;
  unit: string;
  positions: EccentricityPositionResult[];
  status: TestComplianceStatus;
  evaluation: RuleEvaluationResult;
}

export interface DiscriminationInput {
  testLoad: number;
  indication: number;
  addedLoad: number; // e.g. 1.4d
  resultingIndication: number;
  unit: string;
  d: number;
  e: number;
  accuracyClass: AccuracyClass;
  indicationType: 'digital' | 'analog' | 'non_self';
  regulatoryMode: RegulatoryMode;
}

export interface DiscriminationResult {
  testLoad: number;
  initialIndication: number;
  addedLoad: number;
  resultingIndication: number;
  expectedIndication: number;
  deviationFromExpected: number;
  requiredChange: number;
  observedChange: number;
  status: TestComplianceStatus;
  evaluation: RuleEvaluationResult;
}

export interface ZeroSettingInput {
  initialIndication: number;
  zeroSettingAction: string;
  finalIndication: number;
  unit: string;
  e: number;
  d: number;
  additionalLoadAtZero?: number | null;
  remarks?: string | null;
}

export interface ZeroSettingResult {
  initialIndication: number;
  finalIndication: number;
  zeroErrorE0?: number;
  unit: string;
  maxPermissibleZeroError: number; // 0.25e
  status: TestComplianceStatus;
  evaluation: RuleEvaluationResult;
}

export interface ReferenceStandardSuitabilityInput {
  standardIdentifier: string;
  nominalMass: number;
  conventionalMass: number;
  unit: string;
  reportedError: number;
  expandedUncertainty?: number | null;
  certificateNumber?: string | null;
  certificateValidUntil?: string | null;
  instrumentTestLoad: number;
  instrumentMpe: number;
}

export interface ReferenceStandardSuitabilityResult {
  standardIdentifier: string;
  errorCheckStatus: TestComplianceStatus; // Error <= 1/3 instrument MPE
  certificateCheckStatus: TestComplianceStatus; // Valid date & cert number present
  overallSuitabilityStatus: TestComplianceStatus;
  evaluationError: RuleEvaluationResult;
  evaluationCertificate: RuleEvaluationResult;
}

export interface MetrologicalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  max verificationIntervals(): number; // Max / e
}
