-- 006_test_applicability_and_state_model.sql
-- NAWI R-76 System - Phase 3 Test Applicability vs Implementation State Model

-- 1. Add device_configuration to instruments
ALTER TABLE instruments 
ADD COLUMN IF NOT EXISTS device_configuration JSONB DEFAULT '{}' NOT NULL;

-- 2. Add explicit applicability and execution status fields to test_session_tests
ALTER TABLE test_session_tests
ADD COLUMN IF NOT EXISTS applicability_status TEXT DEFAULT 'APPLICABLE' NOT NULL,
ADD COLUMN IF NOT EXISTS applicability_reason TEXT,
ADD COLUMN IF NOT EXISTS applicability_rule_id TEXT,
ADD COLUMN IF NOT EXISTS applicability_evaluated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS execution_status TEXT DEFAULT 'NOT_STARTED' NOT NULL;

-- 3. Update check constraints on test_session_tests
ALTER TABLE test_session_tests DROP CONSTRAINT IF EXISTS chk_test_applicability_status;
ALTER TABLE test_session_tests ADD CONSTRAINT chk_test_applicability_status
    CHECK (applicability_status IN ('APPLICABLE', 'NOT_APPLICABLE', 'REVIEW_REQUIRED'));

ALTER TABLE test_session_tests DROP CONSTRAINT IF EXISTS chk_test_execution_status;
ALTER TABLE test_session_tests ADD CONSTRAINT chk_test_execution_status
    CHECK (execution_status IN ('NOT_STARTED', 'INCOMPLETE', 'COMPLETED'));

ALTER TABLE test_session_tests DROP CONSTRAINT IF EXISTS chk_session_test_status;
ALTER TABLE test_session_tests ADD CONSTRAINT chk_session_test_status
    CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'INCOMPLETE', 'PASS', 'FAIL', 'REVIEW_REQUIRED', 'NOT_APPLICABLE'));

-- 4. Update the Essae DS-252 instrument device configuration with verified characteristics
UPDATE instruments
SET device_configuration = '{
  "indicationType": "digital",
  "hasMultipleIndicators": false,
  "hasRemoteDisplay": false,
  "hasPrinter": false,
  "hasEquilibriumExtension": false,
  "hasTareDevice": true,
  "isTiltSensitive": false,
  "isRollingLoad": false,
  "supportsCount": 4,
  "receptorType": "PLATFORM"
}'::jsonb
WHERE LOWER(manufacturer) = 'essae' AND (LOWER(model_number) = 'ds-252' OR LOWER(serial_number) LIKE '%ds252%');
