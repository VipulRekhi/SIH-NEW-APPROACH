export type RegulatoryMode =
  | 'TYPE_EVALUATION'
  | 'INITIAL_VERIFICATION'
  | 'SUBSEQUENT_VERIFICATION'
  | 'SERVICE_INSPECTION';

export type SessionStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'REVIEW_REQUIRED'
  | 'COMPLETED'
  | 'PASSED'
  | 'FAILED';

export type TestComplianceStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'INCOMPLETE'
  | 'PASS'
  | 'FAIL'
  | 'REVIEW_REQUIRED'
  | 'NOT_APPLICABLE';

export type TestApplicabilityStatus =
  | 'APPLICABLE'
  | 'NOT_APPLICABLE'
  | 'REVIEW_REQUIRED';

export type TestExecutionStatus =
  | 'NOT_STARTED'
  | 'INCOMPLETE'
  | 'COMPLETED';

export type TestImplementationState =
  | 'IMPLEMENTED'
  | 'PARTIAL'
  | 'REVIEW_ONLY'
  | 'DEFERRED';

export interface TestType {
  id: string;
  code: string;
  name: string;
  description: string;
  r76_reference: string;
  implementation_state: TestImplementationState;
  enabled: boolean;
  display_order: number;
}

export interface TestSession {
  id: string;
  instrument_id: string;
  laboratory_id: string;
  created_by: string;
  session_number: string;
  regulatory_mode: RegulatoryMode;
  regulation_version: string;
  test_date: string;
  status: SessionStatus;
  environmental_conditions: {
    temperature?: number;
    humidity?: number;
    atmosphericPressure?: number;
    remarks?: string;
  };
  reference_standards: {
    identifier: string;
    nominalMass: number;
    conventionalMass?: number;
    unit: string;
    certificateNumber?: string;
    certificateValidUntil?: string;
    reportedError?: number;
  }[];
  applicability_context: Record<string, any>;
  metrological_validation_status: 'PENDING' | 'VALID' | 'INVALID';
  metrological_validation_errors: string[];
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined instrument fields
  manufacturer?: string;
  model_number?: string;
  serial_number?: string;
  instrument_type?: string;
  accuracy_class?: string;
  max_capacity?: number;
  min_capacity?: number;
  scale_interval?: number;
  verification_scale_interval?: number;
  unit?: string;
  laboratory_name?: string;
  technician_name?: string;
  total_tests?: number;
  completed_tests?: number;
}

export interface TestSessionTest {
  id: string;
  test_session_id: string;
  test_type_id: string;
  status: TestComplianceStatus;
  applicability_status?: TestApplicabilityStatus;
  applicability_reason?: string | null;
  applicability_rule_id?: string | null;
  execution_status?: TestExecutionStatus;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  calculation_summary?: any;
  code: string;
  name: string;
  description: string;
  r76_reference: string;
  implementation_state: TestImplementationState;
  display_order: number;
}

export interface TestObservation {
  id: string;
  test_session_test_id: string;
  sequence_no: number;
  direction?: 'LOADING' | 'UNLOADING' | 'NONE';
  load_value: number;
  load_unit: string;
  indication_value: number;
  indication_unit: string;
  additional_load?: number | null;
  zero_error?: number | null;
  raw_error?: number | null;
  corrected_error?: number | null;
  position?: string | null;
  repeat_number?: number | null;
  remarks?: string | null;
  created_at: string;
}

export interface TestResult {
  id: string;
  test_session_test_id: string;
  rule_id?: string;
  result_type: string;
  value?: number;
  unit?: string;
  limit_value?: number;
  pass_fail: TestComplianceStatus;
  calculation_reference: string;
  calculation_details: {
    ruleId: string;
    regulation: string;
    edition: string;
    clause: string;
    formula: string;
    inputs: Record<string, any>;
    intermediateValues: Record<string, any>;
    limit: Record<string, any>;
    result: Record<string, any>;
    status: TestComplianceStatus;
    explanation: string;
  };
  created_at: string;
}

export interface RecommendedLoadPoint {
  stepNumber: number;
  direction: 'LOADING' | 'UNLOADING';
  loadValue: number;
  unit: string;
  rationale: string;
}
