-- 003_instrument_domain.sql
-- NAWI R-76 System - Phase 2 Instrument Management & OCR Domain

-- 1. INSTRUMENTS TABLE
CREATE TABLE IF NOT EXISTS instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE RESTRICT,
    manufacturer TEXT NOT NULL,
    model_number TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    instrument_type TEXT NOT NULL,
    accuracy_class TEXT NOT NULL,
    max_capacity NUMERIC NOT NULL,
    min_capacity NUMERIC NOT NULL,
    scale_interval NUMERIC NOT NULL,
    verification_scale_interval NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_instrument_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'UNDER_REVIEW')),
    CONSTRAINT chk_instrument_capacity CHECK (max_capacity > 0 AND min_capacity >= 0 AND max_capacity >= min_capacity),
    CONSTRAINT chk_instrument_intervals CHECK (scale_interval > 0 AND verification_scale_interval > 0)
);

-- 2. INSTRUMENT FILES TABLE
CREATE TABLE IF NOT EXISTS instrument_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID REFERENCES instruments(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    document_type TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_doc_type CHECK (document_type IN ('NAMEPLATE', 'INSTRUMENT_PHOTO', 'SUPPORTING_DOCUMENT'))
);

-- 3. OCR RESULTS TABLE
CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
    file_id UUID NOT NULL REFERENCES instrument_files(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    extracted_data JSONB NOT NULL,
    confidence_data JSONB,
    ocr_status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_ocr_status CHECK (ocr_status IN ('PROCESSING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED'))
);

-- 4. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Performance and search indexes
CREATE INDEX IF NOT EXISTS idx_instruments_serial ON instruments(serial_number);
CREATE INDEX IF NOT EXISTS idx_instruments_manufacturer ON instruments(manufacturer);
CREATE INDEX IF NOT EXISTS idx_instruments_model ON instruments(model_number);
CREATE INDEX IF NOT EXISTS idx_instruments_lab_id ON instruments(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_instruments_status ON instruments(status);
CREATE INDEX IF NOT EXISTS idx_instrument_files_inst_id ON instrument_files(instrument_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_inst_id ON ocr_results(instrument_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_file_id ON ocr_results(file_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Unique index to prevent duplicate serial numbers for the same manufacturer in the same laboratory
CREATE UNIQUE INDEX IF NOT EXISTS uq_inst_lab_mfg_serial 
ON instruments(laboratory_id, LOWER(manufacturer), LOWER(serial_number));

-- Updated at trigger
DROP TRIGGER IF EXISTS trg_instruments_updated_at ON instruments;
CREATE TRIGGER trg_instruments_updated_at
BEFORE UPDATE ON instruments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
