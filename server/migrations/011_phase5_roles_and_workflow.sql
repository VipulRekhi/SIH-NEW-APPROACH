-- Migration 011: Phase 5 Role-Based Metrological Workflow & Institutional Persona Separation
-- OIML R 76-1:2006 Standards System

-- 1. Ensure Roles Exist
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system administration, user & laboratory management')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
    ('officer', 'Authorized review officer for test verification and report approval')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
    ('technician', 'Metrological test data entry and test session operator')
ON CONFLICT (name) DO NOTHING;

-- 2. Update/Seed Demo Persona Users
DO $$
DECLARE
    v_lab_id UUID;
    v_admin_role_id INT;
    v_officer_role_id INT;
    v_tech_role_id INT;
BEGIN
    SELECT id INTO v_lab_id FROM laboratories LIMIT 1;
    SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;
    SELECT id INTO v_officer_role_id FROM roles WHERE name = 'officer' LIMIT 1;
    SELECT id INTO v_tech_role_id FROM roles WHERE name = 'technician' LIMIT 1;

    -- Update existing admin user name to Rakesh Sharma
    UPDATE users 
    SET full_name = 'Rakesh Sharma', updated_at = NOW() 
    WHERE email = 'admin@nawi.gov.in';

    -- Seed Rakesh Sharma (Admin)
    INSERT INTO users (full_name, email, password_hash, role_id, laboratory_id, is_active)
    VALUES (
        'Rakesh Sharma',
        'rakesh.sharma@nawi.gov.in',
        '$2a$10$XETwyP.tAcYWtuoSxOFb..Uk8ygmGN1651V06cLgYNvHUntWRHVt2',
        v_admin_role_id,
        v_lab_id,
        true
    )
    ON CONFLICT (email) DO UPDATE 
    SET full_name = 'Rakesh Sharma', role_id = v_admin_role_id, updated_at = NOW();

    -- Seed Anand Deshpande (Officer)
    INSERT INTO users (full_name, email, password_hash, role_id, laboratory_id, is_active)
    VALUES (
        'Anand Deshpande',
        'anand.deshpande@nawi.gov.in',
        '$2a$10$CDW/DF6qPedt6gWl8TS/Ye6VT.pIrkvRxxqPGDiXy0gUydOtIr44K',
        v_officer_role_id,
        v_lab_id,
        true
    )
    ON CONFLICT (email) DO UPDATE 
    SET full_name = 'Anand Deshpande', role_id = v_officer_role_id, updated_at = NOW();

    -- Seed Pramod Patil (Technician)
    INSERT INTO users (full_name, email, password_hash, role_id, laboratory_id, is_active)
    VALUES (
        'Pramod Patil',
        'pramod.patil@nawi.gov.in',
        '$2a$10$CDW/DF6qPedt6gWl8TS/Ye6VT.pIrkvRxxqPGDiXy0gUydOtIr44K',
        v_tech_role_id,
        v_lab_id,
        true
    )
    ON CONFLICT (email) DO UPDATE 
    SET full_name = 'Pramod Patil', role_id = v_tech_role_id, updated_at = NOW();

END $$;

-- 3. Update Test Session Constraints & Lifecycle Columns
ALTER TABLE test_sessions DROP CONSTRAINT IF EXISTS chk_session_status;
ALTER TABLE test_sessions ADD CONSTRAINT chk_session_status CHECK (
    status IN (
        'DRAFT',
        'IN_PROGRESS',
        'SUBMITTED_FOR_REVIEW',
        'UNDER_REVIEW',
        'RETURNED_FOR_CORRECTION',
        'REJECTED',
        'APPROVED',
        'OFFICIAL_REPORT_GENERATED',
        'PASSED',
        'FAILED',
        'COMPLETED',
        'REVIEW_REQUIRED'
    )
);

ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT';
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id);
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- 4. Update Reports Table to Track Officer and Technician
ALTER TABLE reports ADD COLUMN IF NOT EXISTS officer_id UUID REFERENCES users(id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES users(id);

-- 5. Indexes for Workflow and Repositories
CREATE INDEX IF NOT EXISTS idx_test_sessions_workflow_status ON test_sessions(workflow_status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_created_by ON test_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_test_sessions_submitted_by ON test_sessions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_test_sessions_reviewed_by ON test_sessions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_reports_officer_id ON reports(officer_id);
CREATE INDEX IF NOT EXISTS idx_reports_technician_id ON reports(technician_id);
