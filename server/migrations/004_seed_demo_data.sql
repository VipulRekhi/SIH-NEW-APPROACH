-- 004_seed_demo_data.sql
-- Seed standard development laboratory and demo instrument

DO $$
DECLARE
    lab_id UUID;
    admin_id UUID;
    inst_id UUID;
BEGIN
    -- 1. Ensure Central Legal Metrology Laboratory exists
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

    -- 2. Associate existing users to this default laboratory if they have none
    UPDATE users SET laboratory_id = lab_id WHERE laboratory_id IS NULL;

    -- 3. Retrieve admin user ID for attribution
    SELECT id INTO admin_id FROM users WHERE email = 'admin@nawi.gov.in' LIMIT 1;
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM users LIMIT 1;
    END IF;

    -- 4. Seed demo instrument if not already present
    IF admin_id IS NOT NULL THEN
        SELECT id INTO inst_id FROM instruments 
        WHERE laboratory_id = lab_id 
          AND LOWER(manufacturer) = 'abc weighing systems' 
          AND LOWER(serial_number) = 'abx93821';

        IF inst_id IS NULL THEN
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
                'ABC Weighing Systems',
                'ABC-30',
                'ABX93821',
                'Non-Automatic Weighing Instrument (Bench Scale)',
                'III',
                30.000,
                0.200,
                0.005,
                0.010,
                'kg',
                'ACTIVE',
                'Demonstration legal metrology bench scale for OIML R-76 calibration verification.',
                admin_id
            )
            RETURNING id INTO inst_id;

            -- Audit log
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
            VALUES (
                admin_id,
                'INSTRUMENT_CREATED',
                'INSTRUMENT',
                inst_id,
                jsonb_build_object('source', 'demo_seed', 'serial', 'ABX93821')
            );
        END IF;
    END IF;
END $$;
