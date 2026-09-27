import { query } from '../config/db.js';

export interface CreateSessionData {
  instrumentId: string;
  laboratoryId: string;
  createdBy: string;
  sessionNumber: string;
  regulatoryMode?: string;
  regulationVersion?: string;
  testDate?: string;
  environmentalConditions?: Record<string, any>;
  referenceStandards?: any[];
  applicabilityContext?: Record<string, any>;
  notes?: string | null;
  metrologicalValidationStatus?: string;
  metrologicalValidationErrors?: string[];
}

export class TestSessionRepository {
  static async create(data: CreateSessionData) {
    const res = await query(
      `INSERT INTO test_sessions (
        instrument_id, laboratory_id, created_by, session_number,
        regulatory_mode, regulation_version, test_date, status,
        environmental_conditions, reference_standards, applicability_context, notes,
        metrological_validation_status, metrological_validation_errors
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.instrumentId,
        data.laboratoryId,
        data.createdBy,
        data.sessionNumber,
        data.regulatoryMode || 'TYPE_EVALUATION',
        data.regulationVersion || 'OIML R 76-1:2006',
        data.testDate || new Date().toISOString().split('T')[0],
        JSON.stringify(data.environmentalConditions || {}),
        JSON.stringify(data.referenceStandards || []),
        JSON.stringify(data.applicabilityContext || {}),
        data.notes || null,
        data.metrologicalValidationStatus || 'PENDING',
        JSON.stringify(data.metrologicalValidationErrors || [])
      ]
    );
    return res.rows[0];
  }

  static async findById(id: string, laboratoryId?: string) {
    let sql = `
      SELECT ts.*,
             i.manufacturer, i.model_number, i.serial_number, i.instrument_type,
             i.accuracy_class, i.max_capacity, i.min_capacity,
             i.scale_interval, i.verification_scale_interval, i.unit,
             l.name as laboratory_name,
             u.full_name as technician_name,
             u_sub.full_name as submitted_by_name,
             u_rev.full_name as reviewed_by_name,
             u_app.full_name as approved_by_name,
             r.id as report_id, r.report_number, r.public_verification_id,
             r.overall_status as report_overall_status,
             r.pdf_path as report_pdf_path,
             r.certificate_pdf_path,
             r.detailed_pdf_path,
             r.excel_path as report_excel_path
      FROM test_sessions ts
      JOIN instruments i ON ts.instrument_id = i.id
      JOIN laboratories l ON ts.laboratory_id = l.id
      JOIN users u ON ts.created_by = u.id
      LEFT JOIN users u_sub ON ts.submitted_by = u_sub.id
      LEFT JOIN users u_rev ON ts.reviewed_by = u_rev.id
      LEFT JOIN users u_app ON ts.approved_by = u_app.id
      LEFT JOIN reports r ON r.test_session_id = ts.id
      WHERE ts.id = $1
    `;
    const params: any[] = [id];
    if (laboratoryId) {
      sql += ` AND ts.laboratory_id = $2`;
      params.push(laboratoryId);
    }
    const res = await query(sql, params);
    if (!res.rows[0]) return null;

    const row = res.rows[0];
    return {
      ...row,
      max_capacity: parseFloat(row.max_capacity),
      min_capacity: parseFloat(row.min_capacity),
      scale_interval: parseFloat(row.scale_interval),
      verification_scale_interval: parseFloat(row.verification_scale_interval)
    };
  }

  static async list(filter: {
    laboratoryId?: string;
    status?: string;
    workflowStatus?: string;
    createdBy?: string;
    instrumentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filter.laboratoryId) {
      conditions.push(`ts.laboratory_id = $${idx++}`);
      params.push(filter.laboratoryId);
    }

    if (filter.status) {
      conditions.push(`ts.status = $${idx++}`);
      params.push(filter.status);
    }

    if (filter.workflowStatus) {
      conditions.push(`ts.workflow_status = $${idx++}`);
      params.push(filter.workflowStatus);
    }

    if (filter.createdBy) {
      conditions.push(`ts.created_by = $${idx++}`);
      params.push(filter.createdBy);
    }

    if (filter.instrumentId) {
      conditions.push(`ts.instrument_id = $${idx++}`);
      params.push(filter.instrumentId);
    }

    if (filter.search) {
      const term = `%${filter.search.trim()}%`;
      conditions.push(`(ts.session_number ILIKE $${idx} OR i.serial_number ILIKE $${idx} OR i.manufacturer ILIKE $${idx} OR i.model_number ILIKE $${idx})`);
      params.push(term);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*)::int as total FROM test_sessions ts
       JOIN instruments i ON ts.instrument_id = i.id ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));
    const offset = (page - 1) * limit;

    const listSql = `
      SELECT ts.*,
             i.manufacturer, i.model_number, i.serial_number, i.accuracy_class,
             i.max_capacity, i.unit,
             l.name as laboratory_name,
             u.full_name as technician_name,
             u_sub.full_name as submitted_by_name,
             u_rev.full_name as reviewed_by_name,
             u_app.full_name as approved_by_name,
             r.report_number, r.public_verification_id, r.overall_status as report_overall_status,
             (SELECT COUNT(*) FROM test_session_tests WHERE test_session_id = ts.id)::int as total_tests,
             (SELECT COUNT(*) FROM test_session_tests WHERE test_session_id = ts.id AND status IN ('PASS', 'FAIL', 'REVIEW_REQUIRED', 'NOT_APPLICABLE'))::int as completed_tests
      FROM test_sessions ts
      JOIN instruments i ON ts.instrument_id = i.id
      JOIN laboratories l ON ts.laboratory_id = l.id
      JOIN users u ON ts.created_by = u.id
      LEFT JOIN users u_sub ON ts.submitted_by = u_sub.id
      LEFT JOIN users u_rev ON ts.reviewed_by = u_rev.id
      LEFT JOIN users u_app ON ts.approved_by = u_app.id
      LEFT JOIN reports r ON r.test_session_id = ts.id
      ${whereClause}
      ORDER BY ts.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    params.push(limit, offset);
    const listRes = await query(listSql, params);

    return { items: listRes.rows, total };
  }

  static async updateWorkflow(
    id: string,
    updates: {
      workflowStatus: string;
      status?: string;
      submittedAt?: Date | null;
      submittedBy?: string | null;
      reviewedAt?: Date | null;
      reviewedBy?: string | null;
      reviewerComments?: string | null;
      rejectionReason?: string | null;
      returnedAt?: Date | null;
      approvedAt?: Date | null;
      approvedBy?: string | null;
    }
  ) {
    const fields: string[] = ['workflow_status = $1'];
    const params: any[] = [updates.workflowStatus];
    let idx = 2;

    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(updates.status);
    }
    if (updates.submittedAt !== undefined) {
      fields.push(`submitted_at = $${idx++}`);
      params.push(updates.submittedAt);
    }
    if (updates.submittedBy !== undefined) {
      fields.push(`submitted_by = $${idx++}`);
      params.push(updates.submittedBy);
    }
    if (updates.reviewedAt !== undefined) {
      fields.push(`reviewed_at = $${idx++}`);
      params.push(updates.reviewedAt);
    }
    if (updates.reviewedBy !== undefined) {
      fields.push(`reviewed_by = $${idx++}`);
      params.push(updates.reviewedBy);
    }
    if (updates.reviewerComments !== undefined) {
      fields.push(`reviewer_comments = $${idx++}`);
      params.push(updates.reviewerComments);
    }
    if (updates.rejectionReason !== undefined) {
      fields.push(`rejection_reason = $${idx++}`);
      params.push(updates.rejectionReason);
    }
    if (updates.returnedAt !== undefined) {
      fields.push(`returned_at = $${idx++}`);
      params.push(updates.returnedAt);
    }
    if (updates.approvedAt !== undefined) {
      fields.push(`approved_at = $${idx++}`);
      params.push(updates.approvedAt);
    }
    if (updates.approvedBy !== undefined) {
      fields.push(`approved_by = $${idx++}`);
      params.push(updates.approvedBy);
    }

    params.push(id);
    const sql = `UPDATE test_sessions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  static async getInstrumentHistory(instrumentId: string) {
    const res = await query(
      `SELECT ts.id, ts.session_number, ts.regulatory_mode, ts.regulation_version,
              ts.test_date, ts.status, ts.workflow_status, ts.created_at,
              u.full_name as technician_name,
              u_app.full_name as officer_name,
              r.id as report_id, r.report_number, r.public_verification_id,
              r.overall_status as report_overall_status,
              r.created_at as report_issued_at
       FROM test_sessions ts
       JOIN users u ON ts.created_by = u.id
       LEFT JOIN users u_app ON ts.approved_by = u_app.id
       LEFT JOIN reports r ON r.test_session_id = ts.id
       WHERE ts.instrument_id = $1
       ORDER BY ts.created_at DESC`,
      [instrumentId]
    );
    return res.rows;
  }

  static async updateStatus(id: string, status: string, startedAt?: Date, completedAt?: Date) {
    let sql = `UPDATE test_sessions SET status = $1`;
    const params: any[] = [status, id];
    let idx = 2;

    if (startedAt !== undefined) {
      sql += `, started_at = $${++idx}`;
      params.push(startedAt);
    }
    if (completedAt !== undefined) {
      sql += `, completed_at = $${++idx}`;
      params.push(completedAt);
    }

    sql += ` WHERE id = $2 RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  static async updateEnvironment(id: string, env: any, standards: any[], notes?: string | null) {
    const res = await query(
      `UPDATE test_sessions
       SET environmental_conditions = $1, reference_standards = $2, notes = COALESCE($3, notes)
       WHERE id = $4
       RETURNING *`,
      [JSON.stringify(env || {}), JSON.stringify(standards || []), notes, id]
    );
    return res.rows[0] || null;
  }

  static async assignTests(
    sessionId: string,
    testsToAssign: Array<string | {
      testTypeId: string;
      applicabilityStatus?: string;
      applicabilityReason?: string;
      applicabilityRuleId?: string;
      status?: string;
      executionStatus?: string;
    }>
  ) {
    for (const item of testsToAssign) {
      if (typeof item === 'string') {
        await query(
          `INSERT INTO test_session_tests (test_session_id, test_type_id, status, applicability_status, execution_status)
           VALUES ($1, $2, 'DRAFT', 'APPLICABLE', 'NOT_STARTED')
           ON CONFLICT (test_session_id, test_type_id) DO NOTHING`,
          [sessionId, item]
        );
      } else {
        const appStatus = item.applicabilityStatus || 'APPLICABLE';
        const execStatus = item.executionStatus || (appStatus === 'NOT_APPLICABLE' ? 'COMPLETED' : 'NOT_STARTED');
        const testStatus = item.status || (appStatus === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : (appStatus === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'DRAFT'));
        
        await query(
          `INSERT INTO test_session_tests (
             test_session_id, test_type_id, status,
             applicability_status, applicability_reason, applicability_rule_id,
             applicability_evaluated_at, execution_status
           )
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
           ON CONFLICT (test_session_id, test_type_id) DO UPDATE SET
             applicability_status = EXCLUDED.applicability_status,
             applicability_reason = EXCLUDED.applicability_reason,
             applicability_rule_id = EXCLUDED.applicability_rule_id,
             applicability_evaluated_at = CURRENT_TIMESTAMP,
             status = EXCLUDED.status,
             execution_status = EXCLUDED.execution_status`,
          [
            sessionId,
            item.testTypeId,
            testStatus,
            appStatus,
            item.applicabilityReason || null,
            item.applicabilityRuleId || null,
            execStatus
          ]
        );
      }
    }
  }

  static async updateTestApplicability(
    testId: string,
    applicabilityStatus: string,
    applicabilityReason: string,
    applicabilityRuleId?: string,
    status?: string,
    executionStatus?: string
  ) {
    const res = await query(
      `UPDATE test_session_tests
       SET applicability_status = $1,
           applicability_reason = $2,
           applicability_rule_id = $3,
           applicability_evaluated_at = CURRENT_TIMESTAMP,
           status = COALESCE($4, status),
           execution_status = COALESCE($5, execution_status)
       WHERE id = $6
       RETURNING *`,
      [applicabilityStatus, applicabilityReason, applicabilityRuleId || null, status || null, executionStatus || null, testId]
    );
    return res.rows[0] || null;
  }

  static async getTestsForSession(sessionId: string) {
    const res = await query(
      `SELECT tst.*,
              tt.code, tt.name, tt.description, tt.r76_reference,
              tt.implementation_state, tt.display_order
       FROM test_session_tests tst
       JOIN test_types tt ON tst.test_type_id = tt.id
       WHERE tst.test_session_id = $1
       ORDER BY tt.display_order ASC`,
      [sessionId]
    );
    return res.rows;
  }

  static async getTestById(testId: string) {
    const res = await query(
      `SELECT tst.*,
              tt.code, tt.name, tt.description, tt.r76_reference,
              tt.implementation_state, tt.display_order,
              ts.instrument_id, ts.laboratory_id, ts.regulatory_mode, ts.regulation_version
       FROM test_session_tests tst
       JOIN test_types tt ON tst.test_type_id = tt.id
       JOIN test_sessions ts ON tst.test_session_id = ts.id
       WHERE tst.id = $1`,
      [testId]
    );
    return res.rows[0] || null;
  }

  static async updateTestStatus(
    testId: string,
    status: string,
    calculationSummary?: any,
    executionStatus?: string
  ) {
    const computedExecStatus = executionStatus || (
      ['PASS', 'FAIL', 'NOT_APPLICABLE'].includes(status)
        ? 'COMPLETED'
        : (['IN_PROGRESS', 'INCOMPLETE', 'REVIEW_REQUIRED'].includes(status) ? 'INCOMPLETE' : 'NOT_STARTED')
    );

    const res = await query(
      `UPDATE test_session_tests
       SET status = $1,
           calculation_summary = $2,
           execution_status = $3,
           completed_at = CASE WHEN $1 IN ('PASS', 'FAIL', 'REVIEW_REQUIRED', 'NOT_APPLICABLE') THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $4
       RETURNING *`,
      [
        status,
        calculationSummary !== undefined ? (calculationSummary ? JSON.stringify(calculationSummary) : null) : null,
        computedExecStatus,
        testId
      ]
    );
    return res.rows[0] || null;
  }

  static async createObservation(data: {
    testSessionTestId: string;
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
    rawInput?: any;
  }) {
    const res = await query(
      `INSERT INTO test_observations (
        test_session_test_id, sequence_no, direction,
        load_value, load_unit, indication_value, indication_unit,
        additional_load, zero_error, raw_error, corrected_error,
        position, repeat_number, remarks, raw_input
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        data.testSessionTestId,
        data.sequenceNo,
        data.direction || 'LOADING',
        data.loadValue,
        data.loadUnit || 'kg',
        data.indicationValue,
        data.indicationUnit || 'kg',
        data.additionalLoad ?? null,
        data.zeroError ?? null,
        data.rawError ?? null,
        data.correctedError ?? null,
        data.position || null,
        data.repeatNumber || null,
        data.remarks || null,
        JSON.stringify(data.rawInput || {})
      ]
    );
    return res.rows[0];
  }

  static async getObservationsForTest(testSessionTestId: string) {
    const res = await query(
      `SELECT * FROM test_observations
       WHERE test_session_test_id = $1
       ORDER BY sequence_no ASC, created_at ASC`,
      [testSessionTestId]
    );
    return res.rows.map(r => ({
      ...r,
      load_value: r.load_value !== null ? parseFloat(r.load_value) : null,
      indication_value: r.indication_value !== null ? parseFloat(r.indication_value) : null,
      additional_load: r.additional_load !== null ? parseFloat(r.additional_load) : null,
      zero_error: r.zero_error !== null ? parseFloat(r.zero_error) : null,
      raw_error: r.raw_error !== null ? parseFloat(r.raw_error) : null,
      corrected_error: r.corrected_error !== null ? parseFloat(r.corrected_error) : null
    }));
  }

  static async updateObservation(obsId: string, data: any) {
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const key of ['load_value', 'indication_value', 'additional_load', 'zero_error', 'raw_error', 'corrected_error', 'position', 'repeat_number', 'remarks', 'direction']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        params.push(data[key]);
      }
    }

    if (fields.length === 0) return null;
    params.push(obsId);

    const res = await query(
      `UPDATE test_observations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return res.rows[0] || null;
  }

  static async deleteObservation(obsId: string, testSessionTestId?: string) {
    if (testSessionTestId) {
      const res = await query(
        `DELETE FROM test_observations WHERE id = $1 AND test_session_test_id = $2 RETURNING *`,
        [obsId, testSessionTestId]
      );
      return res.rows[0] || null;
    }
    const res = await query(`DELETE FROM test_observations WHERE id = $1 RETURNING *`, [obsId]);
    return res.rows[0] || null;
  }

  static async deleteResultsForTest(testSessionTestId: string) {
    await query(`DELETE FROM test_results WHERE test_session_test_id = $1`, [testSessionTestId]);
  }

  static async deleteAllObservationsForTest(testSessionTestId: string) {
    await query(`DELETE FROM test_observations WHERE test_session_test_id = $1`, [testSessionTestId]);
  }

  static async saveTestResults(testSessionTestId: string, results: any[]) {
    // Clear previous results for this test run to keep audit fresh
    await query(`DELETE FROM test_results WHERE test_session_test_id = $1`, [testSessionTestId]);

    const saved: any[] = [];
    for (const r of results) {
      const res = await query(
        `INSERT INTO test_results (
          test_session_test_id, rule_id, result_type, value, unit, limit_value,
          pass_fail, calculation_reference, calculation_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          testSessionTestId,
          r.ruleId || null,
          r.resultType,
          r.value !== undefined ? r.value : null,
          r.unit || null,
          r.limitValue !== undefined ? r.limitValue : null,
          r.passFail,
          r.calculationReference,
          JSON.stringify(r.calculationDetails || {})
        ]
      );
      saved.push(res.rows[0]);
    }
    return saved;
  }

  static async getResultsForTest(testSessionTestId: string) {
    const res = await query(
      `SELECT * FROM test_results WHERE test_session_test_id = $1 ORDER BY created_at ASC`,
      [testSessionTestId]
    );
    return res.rows;
  }

  static async getAllTestTypes() {
    const res = await query(`SELECT * FROM test_types WHERE enabled = true ORDER BY display_order ASC`);
    return res.rows;
  }

  static async getAllRules() {
    const res = await query(`SELECT * FROM test_rule_registry ORDER BY clause ASC`);
    return res.rows;
  }
}
