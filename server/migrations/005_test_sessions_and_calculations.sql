-- 005_test_sessions_and_calculations.sql
-- NAWI R-76 System - Phase 3 Testing & Calculation Engine (OIML R 76-1:2006)

-- 1. RULE REGISTRY TABLE
CREATE TABLE IF NOT EXISTS test_rule_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id TEXT NOT NULL UNIQUE,
    regulation TEXT NOT NULL DEFAULT 'OIML R 76-1',
    edition TEXT NOT NULL DEFAULT '2006',
    clause TEXT NOT NULL,
    annex_clause TEXT,
    title TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    formula_description TEXT NOT NULL,
    applicability JSONB NOT NULL DEFAULT '{}',
    is_implemented BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. TEST TYPES DEFINITIONS TABLE
CREATE TABLE IF NOT EXISTS test_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    r76_reference TEXT NOT NULL,
    implementation_state TEXT NOT NULL DEFAULT 'IMPLEMENTED',
    enabled BOOLEAN DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_test_impl_state CHECK (implementation_state IN ('IMPLEMENTED', 'PARTIAL', 'REVIEW_ONLY', 'DEFERRED'))
);

-- 3. TEST SESSIONS TABLE
CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
    laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    session_number TEXT NOT NULL UNIQUE,
    regulatory_mode TEXT NOT NULL DEFAULT 'TYPE_EVALUATION',
    regulation_version TEXT NOT NULL DEFAULT 'OIML R 76-1:2006',
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    environmental_conditions JSONB NOT NULL DEFAULT '{}',
    reference_standards JSONB NOT NULL DEFAULT '[]',
    applicability_context JSONB NOT NULL DEFAULT '{}',
    metrological_validation_status TEXT NOT NULL DEFAULT 'PENDING',
    metrological_validation_errors JSONB DEFAULT '[]',
    notes TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_session_status CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'REVIEW_REQUIRED', 'COMPLETED', 'PASSED', 'FAILED')),
    CONSTRAINT chk_regulatory_mode CHECK (regulatory_mode IN ('TYPE_EVALUATION', 'INITIAL_VERIFICATION', 'SUBSEQUENT_VERIFICATION', 'SERVICE_INSPECTION')),
    CONSTRAINT chk_metro_val_status CHECK (metrological_validation_status IN ('PENDING', 'VALID', 'INVALID'))
);

-- 4. TEST SESSION TESTS TABLE
CREATE TABLE IF NOT EXISTS test_session_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    test_type_id UUID NOT NULL REFERENCES test_types(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    calculation_summary JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_session_test_status CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'PASS', 'FAIL', 'REVIEW_REQUIRED', 'NOT_APPLICABLE')),
    CONSTRAINT uq_session_test UNIQUE (test_session_id, test_type_id)
);

-- 5. TEST OBSERVATIONS TABLE (Raw technician observations - strictly preserved)
CREATE TABLE IF NOT EXISTS test_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_test_id UUID NOT NULL REFERENCES test_session_tests(id) ON DELETE CASCADE,
    sequence_no INT NOT NULL,
    direction TEXT DEFAULT 'LOADING',
    load_value NUMERIC,
    load_unit TEXT DEFAULT 'kg',
    indication_value NUMERIC,
    indication_unit TEXT DEFAULT 'kg',
    additional_load NUMERIC,
    zero_error NUMERIC,
    raw_error NUMERIC,
    corrected_error NUMERIC,
    position TEXT,
    repeat_number INT,
    remarks TEXT,
    raw_input JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_obs_direction CHECK (direction IN ('LOADING', 'UNLOADING', 'NONE'))
);

-- 6. TEST RESULTS TABLE (Audit trail of derived compliance)
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_test_id UUID NOT NULL REFERENCES test_session_tests(id) ON DELETE CASCADE,
    rule_id TEXT,
    result_type TEXT NOT NULL,
    value NUMERIC,
    unit TEXT,
    limit_value NUMERIC,
    pass_fail TEXT NOT NULL,
    calculation_reference TEXT NOT NULL,
    calculation_details JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_result_pass_fail CHECK (pass_fail IN ('PASS', 'FAIL', 'REVIEW_REQUIRED', 'NOT_APPLICABLE'))
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_test_sessions_inst_id ON test_sessions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_lab_id ON test_sessions(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_number ON test_sessions(session_number);
CREATE INDEX IF NOT EXISTS idx_test_session_tests_session_id ON test_session_tests(test_session_id);
CREATE INDEX IF NOT EXISTS idx_test_session_tests_test_type_id ON test_session_tests(test_type_id);
CREATE INDEX IF NOT EXISTS idx_test_observations_test_id ON test_observations(test_session_test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_session_test_id);
CREATE INDEX IF NOT EXISTS idx_rule_registry_rule_id ON test_rule_registry(rule_id);

-- Update timestamp triggers
DROP TRIGGER IF EXISTS trg_test_rule_registry_updated_at ON test_rule_registry;
CREATE TRIGGER trg_test_rule_registry_updated_at
BEFORE UPDATE ON test_rule_registry
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_test_sessions_updated_at ON test_sessions;
CREATE TRIGGER trg_test_sessions_updated_at
BEFORE UPDATE ON test_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_test_session_tests_updated_at ON test_session_tests;
CREATE TRIGGER trg_test_session_tests_updated_at
BEFORE UPDATE ON test_session_tests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- A. Seed Rule Registry with OIML R 76-1:2006 Rules
INSERT INTO test_rule_registry (rule_id, regulation, edition, clause, annex_clause, title, rule_type, formula_description, applicability, is_implemented)
VALUES
('R76-3.4.2', 'OIML R 76-1', '2006', '3.4.2', NULL, 'Scale Interval Ratio (d and e relationship)', 'VALIDATION', 'd < e <= 10d (except Class I where d < 1mg permitted with e = 1mg)', '{"all_instruments": true}', true),
('R76-3.5.1-T6', 'OIML R 76-1', '2006', '3.5.1', NULL, 'Maximum Permissible Errors on Initial Verification', 'MPE', 'Table 6: Class I/II/III/IIII zones: +/-0.5e, +/-1.0e, +/-1.5e', '{"modes": ["TYPE_EVALUATION", "INITIAL_VERIFICATION", "SUBSEQUENT_VERIFICATION"]}', true),
('R76-3.5.2', 'OIML R 76-1', '2006', '3.5.2', NULL, 'Maximum Permissible Errors in Service', 'MPE', 'MPE_service = 2 * MPE_initial', '{"modes": ["SERVICE_INSPECTION"]}', true),
('R76-A.4.4.3', 'OIML R 76-1', '2006', '3.5.1', 'A.4.4.3', 'Error of Indication (Changeover-point method)', 'ERROR', 'P = I + 0.5e - dL; E = P - L; Ec = E - E0; |Ec| <= MPE', '{"indication_type": "digital"}', true),
('R76-3.6.1-A.4.10', 'OIML R 76-1', '2006', '3.6.1', 'A.4.10', 'Repeatability Test', 'REPEATABILITY', 'Delta_I = I_max - I_min <= |MPE(load)|. Type evaluation: 10 readings at ~50% Max and ~100% Max for Max < 1000kg.', '{"all_instruments": true}', true),
('R76-3.6.2.1-A.4.7', 'OIML R 76-1', '2006', '3.6.2.1', 'A.4.7', 'Eccentric Loading - General Receptors (<= 4 points of support)', 'ECCENTRICITY', 'Test load = 1/3 * (Max + Additive_Tare); Load applied at 4 quarter segments; |Ec| <= MPE', '{"support_points": "<=4"}', true),
('R76-3.6.2.2', 'OIML R 76-1', '2006', '3.6.2.2', 'A.4.7', 'Eccentric Loading - More than 4 points of support', 'ECCENTRICITY', 'Test load = 1/(n-1) * (Max + Additive_Tare); Load applied successively over each support point', '{"support_points": ">4"}', true),
('R76-3.6.2.3', 'OIML R 76-1', '2006', '3.6.2.3', 'A.4.7', 'Eccentric Loading - Receptors with minimal off-centre loading (Tanks/Hoppers)', 'ECCENTRICITY', 'Test load = 1/10 * (Max + Additive_Tare); Load applied over each support point', '{"receptor_type": ["tank", "hopper"]}', true),
('R76-3.6.2.4', 'OIML R 76-1', '2006', '3.6.2.4', 'A.4.7', 'Eccentric Loading - Rolling-load Instruments', 'ECCENTRICITY', 'Test load = heaviest concentrated rolling load, not exceeding 0.8 * (Max + Additive_Tare); Positions: beginning, middle, end', '{"rolling_load": true}', true),
('R76-3.8-DIGITAL', 'OIML R 76-1', '2006', '3.8', 'A.4.8', 'Discrimination Test (Digital indication, d >= 5mg)', 'DISCRIMINATION', 'Additional load = 1.4d placed gently on receptor must produce unambiguous change of indication', '{"indication_type": "digital", "d_min_mg": 5}', true),
('R76-3.8-ANALOG', 'OIML R 76-1', '2006', '3.8', 'A.4.8', 'Discrimination Test (Analog / Semi-self indicating)', 'DISCRIMINATION', 'Additional load = 1.0 * MPE (min 1mg) must produce permanent visible displacement', '{"indication_type": "analog"}', true),
('R76-3.8-NON-SELF', 'OIML R 76-1', '2006', '3.8', 'A.4.8', 'Discrimination Test (Non-self indicating)', 'DISCRIMINATION', 'Additional load = 0.4 * MPE (min 1mg) must produce visible displacement', '{"indication_type": "non_self"}', true),
('R76-4.5.2-A.4.2.3', 'OIML R 76-1', '2006', '4.5.2', 'A.4.2.3', 'Accuracy of Zero-Setting', 'ZERO_SETTING', 'Zero-setting error |E0| <= 0.25e (or 0.5d where d < e)', '{"has_zero_setting": true}', true),
('R76-4.6.1', 'OIML R 76-1', '2006', '4.6.1', 'A.4.6', 'Tare Balancing and Tare Weighing Test', 'TARE', 'Tare weighing accuracy: net indication errors evaluated against MPE for net load', '{"has_tare": true}', true),
('R76-3.6.3', 'OIML R 76-1', '2006', '3.6.3', NULL, 'Multiple Indicating Devices Consistency', 'MULTIPLE_INDICATIONS', 'Difference between indications on different devices <= |MPE|; Difference between digital display and printer = 0', '{"multiple_indicators": true}', true),
('R76-3.6.4', 'OIML R 76-1', '2006', '3.6.4', NULL, 'Different Positions of Equilibrium', 'EQUILIBRIUM_POSITIONS', 'Difference between two results for the same load <= |MPE|', '{"equilibrium_device": true}', true),
('R76-3.7.1-ERROR', 'OIML R 76-1', '2006', '3.7.1', NULL, 'Reference Standard Suitability - Standard Weight Maximum Error', 'STANDARD_ERROR', 'Maximum permissible error of standard weights <= 1/3 * MPE(load)', '{"uses_standard_weights": true}', true),
('R76-3.7.1-UNCERTAINTY', 'OIML R 76-1', '2006', '3.7.1', NULL, 'Reference Standard Suitability - Measurement Uncertainty & Traceability', 'STANDARD_UNCERTAINTY', 'Calibration certificate validity and expanded uncertainty verification', '{"uses_standard_weights": true}', true),
('R76-3.9.1-A.5.1', 'OIML R 76-1', '2006', '3.9.1', 'A.5.1', 'Tilting Influence Test (Classes II, III, IIII)', 'TILTING', 'Instrument tilted longitudinally or transversely to tilt limit; error <= MPE', '{"tilt_sensitive": true}', false),
('R76-3.9.2-A.5.3', 'OIML R 76-1', '2006', '3.9.2', 'A.5.3', 'Temperature Influence Test', 'TEMPERATURE', 'Temperature range -10 deg C to +40 deg C (or marked range); error <= MPE', '{"has_electronic_temp_comp": true}', false),
('R76-3.9.3-A.5.2', 'OIML R 76-1', '2006', '3.9.3', 'A.5.2', 'Warm-up Time Test', 'WARM_UP', 'Indication stability after 5, 15, 30 min of power-on', '{"powered": true}', false),
('R76-3.9.4-A.5.4', 'OIML R 76-1', '2006', '3.9.4', 'A.5.4', 'Creep Test', 'CREEP', 'Load close to Max for 30 min; difference between indications <= 0.5e', '{"classes": ["II", "III", "IIII"]}', false),
('R76-A.4.11', 'OIML R 76-1', '2006', '3.9.4', 'A.4.11', 'Zero Return Test', 'ZERO_RETURN', 'Zero deviation after unloading following creep load test <= 0.5e', '{"classes": ["II", "III", "IIII"]}', false)
ON CONFLICT (rule_id) DO UPDATE SET
    clause = EXCLUDED.clause,
    annex_clause = EXCLUDED.annex_clause,
    title = EXCLUDED.title,
    rule_type = EXCLUDED.rule_type,
    formula_description = EXCLUDED.formula_description,
    applicability = EXCLUDED.applicability,
    is_implemented = EXCLUDED.is_implemented;

-- B. Seed Test Types with explicit implementation states
INSERT INTO test_types (code, name, description, r76_reference, implementation_state, enabled, display_order)
VALUES
('WEIGHING_PERFORMANCE', 'Weighing Performance & Intrinsic Error', 'Evaluation of indication errors (loading and unloading) against OIML Table 6 MPE zones using changeover-point method.', 'OIML R 76-1:2006 Clause 3.5.1 & A.4.4.3', 'IMPLEMENTED', true, 1),
('REPEATABILITY', 'Repeatability Test', 'Repeated weighings at ~50% Max and ~100% Max (10 readings for Type Evaluation). Evaluated against applicable load MPE.', 'OIML R 76-1:2006 Clause 3.6.1 & A.4.10', 'IMPLEMENTED', true, 2),
('ECCENTRIC_LOADING', 'Eccentric Loading Test', 'Off-centre load verification based on receptor geometry, support count, and maximum additive tare.', 'OIML R 76-1:2006 Clause 3.6.2 & A.4.7', 'IMPLEMENTED', true, 3),
('ZERO_SETTING', 'Zero-Setting & Zero-Tracking Evaluation', 'Verification of zero-setting range, zero-tracking, and zero indication accuracy via changeover points.', 'OIML R 76-1:2006 Clause 4.5 & A.4.2', 'IMPLEMENTED', true, 4),
('DISCRIMINATION', 'Discrimination Test', 'Evaluation of instrument reaction to an added load (1.4d for digital d >= 5mg; 1.0 MPE for analog; 0.4 MPE for non-self).', 'OIML R 76-1:2006 Clause 3.8 & A.4.8', 'IMPLEMENTED', true, 5),
('MULTIPLE_INDICATING_DEVICES', 'Multiple Indicating Devices Comparison', 'Verification of indication consistency across multiple digital/remote displays and physical printers.', 'OIML R 76-1:2006 Clause 3.6.3', 'IMPLEMENTED', true, 6),
('DIFFERENT_POSITIONS_OF_EQUILIBRIUM', 'Different Positions of Equilibrium', 'Verification of indication consistency on instruments with devices extending self-indication capacity.', 'OIML R 76-1:2006 Clause 3.6.4', 'IMPLEMENTED', true, 7),
('TARE', 'Tare Balancing & Tare Weighing Evaluation', 'Evaluation of tare setting accuracy and net weighing indication errors against applicable MPE.', 'OIML R 76-1:2006 Clause 4.6 & A.4.6', 'PARTIAL', true, 8),
('TILTING', 'Tilting Influence Test', 'Verification of indication stability and error limits when instrument is tilted to its operational limit.', 'OIML R 76-1:2006 Clause 3.9.1 & A.5.1', 'PARTIAL', true, 9),
('TEMPERATURE', 'Static Temperature Influence Test', 'Evaluation of weighing performance under temperature extremes (-10 deg C to +40 deg C or marked range).', 'OIML R 76-1:2006 Clause 3.9.2 & A.5.3', 'PARTIAL', true, 10),
('WARM_UP', 'Warm-Up Time Test', 'Evaluation of zero and load indication drift following prescribed power-on time series (5, 15, 30 min).', 'OIML R 76-1:2006 Clause 3.9.3 & A.5.2', 'PARTIAL', true, 11),
('CREEP', 'Creep Test', 'Evaluation of indication drift under sustained load close to Max over a 30-minute observation period.', 'OIML R 76-1:2006 Clause 3.9.4 & A.5.4', 'PARTIAL', true, 12),
('ZERO_RETURN', 'Zero Return Test', 'Verification that the indication returns to zero within 0.5e after removal of creep load.', 'OIML R 76-1:2006 Clause 3.9.4 & A.4.11', 'PARTIAL', true, 13),
('POWER_SUPPLY', 'Power Supply Variations Test', 'Evaluation of performance under AC voltage variation and battery depletion boundaries.', 'OIML R 76-1:2006 Clause 3.9.5 & A.5.4', 'DEFERRED', true, 14),
('DURABILITY', 'Durability & Endurance Test', 'Repetitive loading endurance verification over 100,000 cycles for applicable instruments.', 'OIML R 76-1:2006 Clause 3.9.6 & A.6', 'DEFERRED', true, 15)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    r76_reference = EXCLUDED.r76_reference,
    implementation_state = EXCLUDED.implementation_state,
    enabled = EXCLUDED.enabled,
    display_order = EXCLUDED.display_order;

-- C. Seed the standard development laboratory and demo instrument (Essae DS-252)
DO $$
DECLARE
    lab_id UUID;
    admin_id UUID;
    demo_inst_id UUID;
BEGIN
    SELECT id INTO lab_id FROM laboratories WHERE name = 'Central Legal Metrology Testing Laboratory' LIMIT 1;
    IF lab_id IS NULL THEN
        INSERT INTO laboratories (name, address, contact_email)
        VALUES (
            'Central Legal Metrology Testing Laboratory',
            'Legal Metrology Bhawan, Institutional Area, New Delhi - 110003',
            'central.lab@metrology.gov.in'
        )
        RETURNING id INTO lab_id;
    END IF;

    SELECT id INTO admin_id FROM users WHERE email = 'admin@nawi.gov.in' LIMIT 1;
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM users LIMIT 1;
    END IF;

    IF admin_id IS NOT NULL AND lab_id IS NOT NULL THEN
        SELECT id INTO demo_inst_id FROM instruments 
        WHERE laboratory_id = lab_id 
          AND LOWER(manufacturer) = 'essae' 
          AND LOWER(serial_number) = LOWER('ETPL/DS252/240781');

        IF demo_inst_id IS NULL THEN
            INSERT INTO instruments (
                laboratory_id,
                manufacturer,
                model_number,
                serial_number,
                instrument_type,
                accuracy_class,
                max_capacity,
                min_capacity,
                scale_interval,
                verification_scale_interval,
                unit,
                status,
                notes,
                created_by
            ) VALUES (
                lab_id,
                'Essae',
                'DS-252',
                'ETPL/DS252/240781',
                'Non-Automatic Weighing Instrument (Digital Bench Scale)',
                'III',
                30.000,
                0.200,
                0.005,
                0.010,
                'kg',
                'ACTIVE',
                'Official SIH 2026 OIML R-76 development and demonstration instrument. Max=30kg, Min=0.2kg, e=0.01kg, d=0.005kg, Class III.',
                admin_id
            )
            RETURNING id INTO demo_inst_id;

            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
            VALUES (
                admin_id,
                'INSTRUMENT_CREATED',
                'INSTRUMENT',
                demo_inst_id,
                jsonb_build_object('source', 'phase3_seed', 'serial', 'ETPL/DS252/240781', 'model', 'DS-252')
            );
        END IF;
    END IF;
END $$;
