export interface Report {
  id: string;
  report_number: string;
  public_verification_id: string;
  test_session_id: string;
  instrument_id: string;
  laboratory_id?: string | null;
  laboratory_name?: string | null;
  laboratory_address?: string | null;
  generated_by?: string | null;
  generated_by_name?: string | null;
  regulatory_mode: string;
  regulation_version: string;
  overall_status: 'PASSED' | 'FAILED' | 'REVIEW_REQUIRED' | 'NOT_APPLICABLE' | string;
  compliance_explanation: string;
  compliance_summary: any;
  environmental_snapshot: {
    temperature?: number | string;
    humidity?: number | string;
    atmosphericPressure?: number | string;
    [key: string]: any;
  };
  instrument_snapshot: {
    manufacturer: string;
    model_number: string;
    serial_number: string;
    instrument_type: string;
    accuracy_class: string;
    max_capacity: number;
    min_capacity: number;
    scale_interval: number;
    verification_scale_interval: number;
    unit: string;
    [key: string]: any;
  };
  test_results_snapshot: any[];
  verification_url: string;
  pdf_file_name: string;
  pdf_path: string;
  certificate_pdf_file_name?: string;
  certificate_pdf_path?: string;
  detailed_pdf_file_name?: string;
  detailed_pdf_path?: string;
  excel_file_name?: string;
  excel_path?: string;
  qr_data_url?: string;
  created_at: string;
  updated_at: string;

  // Joined fields for display
  manufacturer?: string;
  model_number?: string;
  serial_number?: string;
  accuracy_class?: string;
  officer_id?: string | null;
  officer_name?: string | null;
  technician_id?: string | null;
  technician_name?: string | null;
}

export interface PublicVerificationReport {
  reportNumber: string;
  verificationId: string;
  generatedAt: string;
  regulatoryMode: string;
  regulationVersion: string;
  overallStatus: 'PASSED' | 'FAILED' | 'REVIEW_REQUIRED' | 'NOT_APPLICABLE' | string;
  complianceExplanation: string;
  complianceSummary?: any;
  laboratory: {
    name: string;
    address?: string | null;
  };
  instrument: {
    manufacturer: string;
    modelNumber?: string;
    model_number?: string;
    serialNumber?: string;
    serial_number?: string;
    instrumentType?: string;
    instrument_type?: string;
    accuracyClass?: string;
    accuracy_class?: string;
    maxCapacity?: number;
    max_capacity?: number;
    minCapacity?: number;
    min_capacity?: number;
    scaleInterval?: number;
    scale_interval?: number;
    verificationScaleInterval?: number;
    verification_scale_interval?: number;
    unit: string;
    [key: string]: any;
  };
  environmental: {
    temperature?: number | string;
    humidity?: number | string;
    atmosphericPressure?: number | string;
  };
  testSummary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    reviewRequiredTests: number;
    notApplicableTests: number;
    tests: Array<{
      code: string;
      name: string;
      clause: string;
      status: string;
      summary?: any;
      observations?: Array<{
        sequenceNo: number;
        direction?: string;
        loadValue: number;
        loadUnit?: string;
        indicationValue: number;
        indicationUnit?: string;
        additionalLoad?: number | null;
        zeroError?: number | null;
        rawError?: number | null;
        correctedError?: number | null;
        position?: string | null;
        repeatNumber?: number | null;
        remarks?: string | null;
      }>;
      results?: Array<{
        resultType: string;
        value: number;
        unit?: string;
        limitValue?: number;
        passFail: string;
        calculationReference?: string;
        calculationDetails?: any;
      }>;
    }>;
  };
  verificationUrl: string;
  qrDataUrl?: string;
  pdfDownloadUrl: string;
  certificateDownloadUrl?: string;
  detailedDownloadUrl?: string;
  excelDownloadUrl?: string;
}
