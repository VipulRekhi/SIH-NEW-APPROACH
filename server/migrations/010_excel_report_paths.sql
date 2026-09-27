-- Migration 010: Excel Test Data Workbook Support (Phase 4)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS excel_path VARCHAR(500);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS excel_file_name VARCHAR(120);
