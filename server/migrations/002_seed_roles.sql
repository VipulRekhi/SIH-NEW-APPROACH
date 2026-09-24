-- 002_seed_roles.sql
-- Seed standard roles for NAWI R-76 Test Report Generation System

INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system administration, user & laboratory management')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
    ('officer', 'Authorized review officer for test verification and report approval')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
    ('technician', 'Metrological test data entry and test session operator')
ON CONFLICT (name) DO NOTHING;
