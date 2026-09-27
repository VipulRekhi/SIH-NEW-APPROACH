-- Migration 007: Official Test Reports & QR Verification System (Phase 4)
-- Standard: OIML R 76-1:2006

-- 1. Sequence for readable, sequential report numbers (e.g. R76-2026-000001)
CREATE SEQUENCE IF NOT EXISTS report_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Official Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number VARCHAR(60) NOT NULL UNIQUE,
    public_verification_id VARCHAR(60) NOT NULL UNIQUE,
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE RESTRICT,
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
    laboratory_id UUID REFERENCES laboratories(id) ON DELETE SET NULL,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    regulatory_mode VARCHAR(60) NOT NULL,
    regulation_version VARCHAR(60) NOT NULL DEFAULT 'OIML R 76-1:2006',
    overall_status VARCHAR(50) NOT NULL,
    compliance_explanation TEXT NOT NULL,
    compliance_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    environmental_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    instrument_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    test_results_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    verification_url VARCHAR(500) NOT NULL,
    pdf_file_name VARCHAR(120) NOT NULL,
    pdf_path VARCHAR(500) NOT NULL,
    qr_data_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. High-performance lookup indexes
CREATE INDEX IF NOT EXISTS idx_reports_public_verification_id ON reports(public_verification_id);
CREATE INDEX IF NOT EXISTS idx_reports_test_session_id ON reports(test_session_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_number ON reports(report_number);
CREATE INDEX IF NOT EXISTS idx_reports_laboratory_id ON reports(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
