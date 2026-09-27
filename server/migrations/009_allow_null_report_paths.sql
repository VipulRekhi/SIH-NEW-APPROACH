-- Migration 009: Allow NULL on pdf_path and pdf_file_name for report invalidation
ALTER TABLE reports ALTER COLUMN pdf_path DROP NOT NULL;
ALTER TABLE reports ALTER COLUMN pdf_file_name DROP NOT NULL;
