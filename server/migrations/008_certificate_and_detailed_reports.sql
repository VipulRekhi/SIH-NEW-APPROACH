-- Migration 008: Certificate and Detailed Report Dual-PDF Support (Phase 4)
-- OIML R 76-1:2006 Standard
-- Supports strictly 1-page Official Certificate AND Multi-page Detailed Technical Report

ALTER TABLE reports ADD COLUMN IF NOT EXISTS certificate_pdf_path VARCHAR(500);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS certificate_pdf_file_name VARCHAR(120);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS detailed_pdf_path VARCHAR(500);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS detailed_pdf_file_name VARCHAR(120);
