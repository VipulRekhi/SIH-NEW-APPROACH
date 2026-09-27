import { query } from '../config/db.js';

export interface CreateReportData {
  reportNumber: string;
  publicVerificationId: string;
  testSessionId: string;
  instrumentId: string;
  laboratoryId?: string | null;
  generatedBy?: string | null;
  officerId?: string | null;
  technicianId?: string | null;
  regulatoryMode: string;
  regulationVersion?: string;
  overallStatus: string;
  complianceExplanation: string;
  complianceSummary: any;
  environmentalSnapshot: any;
  instrumentSnapshot: any;
  testResultsSnapshot: any[];
  verificationUrl: string;
  pdfFileName: string;
  pdfPath: string;
  certificatePdfFileName?: string;
  certificatePdfPath?: string;
  detailedPdfFileName?: string;
  detailedPdfPath?: string;
  excelFileName?: string;
  excelPath?: string;
  qrDataUrl?: string;
}

export class ReportRepository {
  static async getNextReportNumber(): Promise<string> {
    const res = await query(`SELECT nextval('report_number_seq') as seq`);
    const seq = res.rows[0].seq;
    const year = new Date().getFullYear();
    return `R76-${year}-${String(seq).padStart(6, '0')}`;
  }

  static async create(data: CreateReportData) {
    const res = await query(
      `INSERT INTO reports (
        report_number, public_verification_id, test_session_id, instrument_id,
        laboratory_id, generated_by, officer_id, technician_id, regulatory_mode, regulation_version,
        overall_status, compliance_explanation, compliance_summary,
        environmental_snapshot, instrument_snapshot, test_results_snapshot,
        verification_url, pdf_file_name, pdf_path,
        certificate_pdf_file_name, certificate_pdf_path,
        detailed_pdf_file_name, detailed_pdf_path,
        excel_file_name, excel_path, qr_data_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      RETURNING *`,
      [
        data.reportNumber,
        data.publicVerificationId,
        data.testSessionId,
        data.instrumentId,
        data.laboratoryId || null,
        data.generatedBy || null,
        data.officerId || data.generatedBy || null,
        data.technicianId || null,
        data.regulatoryMode,
        data.regulationVersion || 'OIML R 76-1:2006',
        data.overallStatus,
        data.complianceExplanation,
        JSON.stringify(data.complianceSummary || {}),
        JSON.stringify(data.environmentalSnapshot || {}),
        JSON.stringify(data.instrumentSnapshot || {}),
        JSON.stringify(data.testResultsSnapshot || []),
        data.verificationUrl,
        data.pdfFileName,
        data.pdfPath,
        data.certificatePdfFileName || data.pdfFileName,
        data.certificatePdfPath || data.pdfPath,
        data.detailedPdfFileName || data.pdfFileName,
        data.detailedPdfPath || data.pdfPath,
        data.excelFileName || null,
        data.excelPath || null,
        data.qrDataUrl || null
      ]
    );
    return res.rows[0];
  }

  static async update(id: string, data: Partial<CreateReportData>) {
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const mapping: Record<string, string> = {
      overallStatus: 'overall_status',
      complianceExplanation: 'compliance_explanation',
      complianceSummary: 'compliance_summary',
      environmentalSnapshot: 'environmental_snapshot',
      instrumentSnapshot: 'instrument_snapshot',
      testResultsSnapshot: 'test_results_snapshot',
      verificationUrl: 'verification_url',
      pdfFileName: 'pdf_file_name',
      pdfPath: 'pdf_path',
      certificatePdfFileName: 'certificate_pdf_file_name',
      certificatePdfPath: 'certificate_pdf_path',
      detailedPdfFileName: 'detailed_pdf_file_name',
      detailedPdfPath: 'detailed_pdf_path',
      excelFileName: 'excel_file_name',
      excelPath: 'excel_path',
      qrDataUrl: 'qr_data_url',
      officerId: 'officer_id',
      technicianId: 'technician_id'
    };

    for (const [key, col] of Object.entries(mapping)) {
      if ((data as any)[key] !== undefined) {
        let val = (data as any)[key];
        if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }
        fields.push(`${col} = $${idx++}`);
        params.push(val);
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const sql = `UPDATE reports SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  static async findById(id: string) {
    const res = await query(
      `SELECT r.*,
              l.name as laboratory_name, l.address as laboratory_address,
              u.full_name as generated_by_name,
              u_off.full_name as officer_name,
              u_tech.full_name as technician_name,
              i.manufacturer, i.model_number, i.serial_number
       FROM reports r
       LEFT JOIN laboratories l ON r.laboratory_id = l.id
       LEFT JOIN users u ON r.generated_by = u.id
       LEFT JOIN users u_off ON r.officer_id = u_off.id
       LEFT JOIN users u_tech ON r.technician_id = u_tech.id
       JOIN instruments i ON r.instrument_id = i.id
       WHERE r.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByPublicVerificationId(verificationId: string) {
    const res = await query(
      `SELECT r.*,
              l.name as laboratory_name, l.address as laboratory_address,
              u.full_name as generated_by_name,
              u_off.full_name as officer_name,
              u_tech.full_name as technician_name,
              i.manufacturer, i.model_number, i.serial_number
       FROM reports r
       LEFT JOIN laboratories l ON r.laboratory_id = l.id
       LEFT JOIN users u ON r.generated_by = u.id
       LEFT JOIN users u_off ON r.officer_id = u_off.id
       LEFT JOIN users u_tech ON r.technician_id = u_tech.id
       JOIN instruments i ON r.instrument_id = i.id
       WHERE r.public_verification_id = $1`,
      [verificationId]
    );
    return res.rows[0] || null;
  }

  static async findByTestSessionId(testSessionId: string) {
    const res = await query(
      `SELECT r.*,
              l.name as laboratory_name, l.address as laboratory_address,
              u.full_name as generated_by_name,
              u_off.full_name as officer_name,
              u_tech.full_name as technician_name
       FROM reports r
       LEFT JOIN laboratories l ON r.laboratory_id = l.id
       LEFT JOIN users u ON r.generated_by = u.id
       LEFT JOIN users u_off ON r.officer_id = u_off.id
       LEFT JOIN users u_tech ON r.technician_id = u_tech.id
       WHERE r.test_session_id = $1
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [testSessionId]
    );
    return res.rows[0] || null;
  }

  static async findByReportNumber(reportNumber: string) {
    const res = await query(
      `SELECT * FROM reports WHERE report_number = $1`,
      [reportNumber]
    );
    return res.rows[0] || null;
  }

  static async list(params: {
    laboratoryId?: string;
    status?: string;
    overallStatus?: string;
    regulatoryMode?: string;
    instrumentId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.laboratoryId) {
      conditions.push(`r.laboratory_id = $${idx++}`);
      values.push(params.laboratoryId);
    }

    const statusFilter = params.overallStatus || params.status;
    if (statusFilter) {
      if (statusFilter.toUpperCase() === 'PASS') {
        conditions.push(`(r.overall_status = 'PASSED' OR r.overall_status = 'PASS')`);
      } else if (statusFilter.toUpperCase() === 'FAIL') {
        conditions.push(`(r.overall_status = 'FAILED' OR r.overall_status = 'FAIL')`);
      } else {
        conditions.push(`r.overall_status = $${idx++}`);
        values.push(statusFilter);
      }
    }

    if (params.regulatoryMode) {
      conditions.push(`r.regulatory_mode = $${idx++}`);
      values.push(params.regulatoryMode);
    }

    if (params.instrumentId) {
      conditions.push(`r.instrument_id = $${idx++}`);
      values.push(params.instrumentId);
    }

    if (params.startDate) {
      conditions.push(`r.created_at >= $${idx++}`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`r.created_at <= $${idx++}`);
      values.push(params.endDate);
    }

    if (params.search) {
      conditions.push(`(
        r.report_number ILIKE $${idx} OR
        r.public_verification_id ILIKE $${idx} OR
        i.serial_number ILIKE $${idx} OR
        i.model_number ILIKE $${idx} OR
        i.manufacturer ILIKE $${idx} OR
        u_off.full_name ILIKE $${idx} OR
        u_tech.full_name ILIKE $${idx} OR
        l.name ILIKE $${idx}
      )`);
      values.push(`%${params.search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit || 20;
    const offset = params.offset || 0;

    const countRes = await query(
      `SELECT COUNT(*)::int as total
       FROM reports r
       JOIN instruments i ON r.instrument_id = i.id
       LEFT JOIN laboratories l ON r.laboratory_id = l.id
       LEFT JOIN users u_off ON r.officer_id = u_off.id
       LEFT JOIN users u_tech ON r.technician_id = u_tech.id
       ${whereClause}`,
      values
    );

    const dataRes = await query(
      `SELECT r.*,
              l.name as laboratory_name,
              i.manufacturer, i.model_number, i.serial_number, i.accuracy_class,
              u.full_name as generated_by_name,
              u_off.full_name as officer_name,
              u_tech.full_name as technician_name
       FROM reports r
       LEFT JOIN laboratories l ON r.laboratory_id = l.id
       LEFT JOIN users u ON r.generated_by = u.id
       LEFT JOIN users u_off ON r.officer_id = u_off.id
       LEFT JOIN users u_tech ON r.technician_id = u_tech.id
       JOIN instruments i ON r.instrument_id = i.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return {
      reports: dataRes.rows,
      total: countRes.rows[0]?.total || 0,
      limit,
      offset
    };
  }
}
