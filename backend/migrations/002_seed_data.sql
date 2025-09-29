-- KMRL Train Induction System - Seed Data
-- This script populates the database with initial system data

-- Insert system permissions
INSERT INTO "permissions" ("name", "description", "module") VALUES
-- User management permissions
('user:read', 'View users and their details', 'USER_MANAGEMENT'),
('user:write', 'Create and update users', 'USER_MANAGEMENT'),
('user:delete', 'Delete users from the system', 'USER_MANAGEMENT'),

-- Trainset management permissions
('trainset:read', 'View trainsets and their details', 'TRAINSET_MANAGEMENT'),
('trainset:write', 'Create and update trainsets', 'TRAINSET_MANAGEMENT'),
('trainset:delete', 'Delete trainsets from the system', 'TRAINSET_MANAGEMENT'),

-- Fitness certificate permissions
('fitness:read', 'View fitness certificates', 'FITNESS_MANAGEMENT'),
('fitness:write', 'Create and update fitness certificates', 'FITNESS_MANAGEMENT'),
('fitness:delete', 'Delete fitness certificates', 'FITNESS_MANAGEMENT'),

-- Job card permissions
('jobcard:read', 'View job cards', 'JOB_MANAGEMENT'),
('jobcard:write', 'Create and update job cards', 'JOB_MANAGEMENT'),
('jobcard:delete', 'Delete job cards', 'JOB_MANAGEMENT'),

-- Schedule management permissions
('schedule:read', 'View schedules', 'SCHEDULE_MANAGEMENT'),
('schedule:write', 'Create and update schedules', 'SCHEDULE_MANAGEMENT'),
('schedule:optimize', 'Run schedule optimization', 'SCHEDULE_MANAGEMENT'),
('schedule:delete', 'Delete schedules', 'SCHEDULE_MANAGEMENT'),

-- Analytics and reporting permissions
('analytics:read', 'View analytics and reports', 'ANALYTICS'),
('analytics:export', 'Export analytics data', 'ANALYTICS'),

-- System configuration permissions
('system:config', 'Manage system configuration', 'SYSTEM'),
('system:maintenance', 'Perform system maintenance', 'SYSTEM'),
('system:audit', 'View audit logs', 'SYSTEM');

-- Insert system configurations
INSERT INTO "configurations" ("key", "value", "type", "description", "isSystem") VALUES
-- System settings
('system.name', 'KMRL Train Induction System', 'STRING', 'System name', true),
('system.version', '1.0.0', 'STRING', 'System version', true),
('system.maintenance_mode', 'false', 'BOOLEAN', 'System maintenance mode', true),

-- Optimization settings
('optimization.max_iterations', '1000', 'NUMBER', 'Maximum optimization iterations', false),
('optimization.convergence_threshold', '0.001', 'NUMBER', 'Optimization convergence threshold', false),
('optimization.default_algorithm', 'genetic_algorithm', 'STRING', 'Default optimization algorithm', false),

-- Notification settings
('notifications.enabled', 'true', 'BOOLEAN', 'Enable system notifications', false),
('notifications.email_enabled', 'true', 'BOOLEAN', 'Enable email notifications', false),
('notifications.sms_enabled', 'false', 'BOOLEAN', 'Enable SMS notifications', false),

-- Security settings
('security.session_timeout', '86400', 'NUMBER', 'Session timeout in seconds (24 hours)', false),
('security.max_login_attempts', '5', 'NUMBER', 'Maximum login attempts before lockout', false),
('security.password_min_length', '8', 'NUMBER', 'Minimum password length', false),

-- Business rules
('business.max_trainsets_per_schedule', '50', 'NUMBER', 'Maximum trainsets per schedule', false),
('business.fitness_warning_days', '30', 'NUMBER', 'Days before fitness expiry to warn', false),
('business.maintenance_grace_days', '7', 'NUMBER', 'Grace period for maintenance scheduling', false),

-- Integration settings
('integration.maximo.enabled', 'false', 'BOOLEAN', 'Enable Maximo integration', false),
('integration.maximo.sync_interval', '3600', 'NUMBER', 'Maximo sync interval in seconds', false),
('integration.iot.enabled', 'true', 'BOOLEAN', 'Enable IoT sensor integration', false);

-- Insert stabling positions
INSERT INTO "stabling_positions" ("positionNumber", "type", "capacity", "features", "coordinates") VALUES
(1, 'maintenance', 1, '{"crane": true, "pit": true, "power": "3-phase"}', '{"x": 100, "y": 50}'),
(2, 'maintenance', 1, '{"crane": true, "pit": false, "power": "single-phase"}', '{"x": 120, "y": 50}'),
(3, 'cleaning', 2, '{"wash_system": true, "compressed_air": true}', '{"x": 140, "y": 50}'),
(4, 'cleaning', 2, '{"wash_system": true, "compressed_air": true}', '{"x": 160, "y": 50}'),
(5, 'parking', 3, '{"charging": true, "shelter": true}', '{"x": 180, "y": 50}'),
(6, 'parking', 3, '{"charging": true, "shelter": true}', '{"x": 200, "y": 50}'),
(7, 'parking', 3, '{"charging": false, "shelter": true}', '{"x": 220, "y": 50}'),
(8, 'parking', 3, '{"charging": false, "shelter": true}', '{"x": 240, "y": 50}'),
(9, 'inspection', 1, '{"lift": true, "tools": true, "lighting": "LED"}', '{"x": 260, "y": 50}'),
(10, 'inspection', 1, '{"lift": true, "tools": true, "lighting": "LED"}', '{"x": 280, "y": 50}');

-- Create default admin user (password: admin123!)
-- Note: In production, this should be changed immediately
INSERT INTO "users" ("email", "password", "firstName", "lastName", "role") VALUES
('admin@kmrl.gov.in', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqyJirc9aA8EQ1XPnN6QfSa', 'System', 'Administrator', 'ADMIN');

-- Get the admin user ID for permissions
DO $$
DECLARE 
    admin_user_id TEXT;
    permission_id TEXT;
BEGIN
    SELECT id INTO admin_user_id FROM "users" WHERE email = 'admin@kmrl.gov.in';
    
    -- Grant all permissions to admin user
    FOR permission_id IN SELECT id FROM "permissions"
    LOOP
        INSERT INTO "user_permissions" ("userId", "permissionId") VALUES (admin_user_id, permission_id);
    END LOOP;
END $$;

-- Insert sample trainsets
INSERT INTO "trainsets" ("trainsetNumber", "manufacturer", "model", "yearOfManufacture", "capacity", "maxSpeed", "depot", "currentMileage", "totalMileage") VALUES
('KMRL-001', 'Alstom', 'Metropolis', 2017, 975, 80.0, 'Muttom Depot', 45230.5, 156789.2),
('KMRL-002', 'Alstom', 'Metropolis', 2017, 975, 80.0, 'Muttom Depot', 42156.8, 148234.6),
('KMRL-003', 'Alstom', 'Metropolis', 2017, 975, 80.0, 'Muttom Depot', 43789.1, 152456.9),
('KMRL-004', 'Alstom', 'Metropolis', 2018, 975, 80.0, 'Muttom Depot', 38967.4, 142789.3),
('KMRL-005', 'Alstom', 'Metropolis', 2018, 975, 80.0, 'Muttom Depot', 41234.7, 149567.8),
('KMRL-006', 'Alstom', 'Metropolis', 2018, 975, 80.0, 'Kalamassery Depot', 44567.2, 158932.4),
('KMRL-007', 'Alstom', 'Metropolis', 2018, 975, 80.0, 'Kalamassery Depot', 39856.9, 145678.1),
('KMRL-008', 'Alstom', 'Metropolis', 2019, 975, 80.0, 'Kalamassery Depot', 37245.6, 138456.7),
('KMRL-009', 'Alstom', 'Metropolis', 2019, 975, 80.0, 'Kalamassery Depot', 40123.8, 147892.3),
('KMRL-010', 'Alstom', 'Metropolis', 2019, 975, 80.0, 'Kalamassery Depot', 41789.5, 151234.6);

-- Insert sample fitness certificates
DO $$
DECLARE 
    trainset_record RECORD;
    cert_number TEXT;
    issue_date DATE;
    expiry_date DATE;
BEGIN
    FOR trainset_record IN SELECT id, "trainsetNumber" FROM "trainsets"
    LOOP
        cert_number := 'FIT-' || trainset_record."trainsetNumber" || '-' || TO_CHAR(CURRENT_DATE, 'YYYY');
        issue_date := CURRENT_DATE - INTERVAL '6 months';
        expiry_date := CURRENT_DATE + INTERVAL '6 months';
        
        INSERT INTO "fitness_certificates" (
            "trainsetId", 
            "certificateNumber", 
            "issueDate", 
            "expiryDate", 
            "status", 
            "issuingAuthority",
            "remarks",
            "lastChecked"
        ) VALUES (
            trainset_record.id,
            cert_number,
            issue_date,
            expiry_date,
            CASE 
                WHEN RANDOM() > 0.9 THEN 'EXPIRED'::fitness_status
                WHEN RANDOM() > 0.8 THEN 'PENDING'::fitness_status
                ELSE 'VALID'::fitness_status
            END,
            'KMRL Technical Department',
            'Annual fitness certificate',
            CURRENT_TIMESTAMP
        );
    END LOOP;
END $$;

-- Insert sample job cards
DO $$
DECLARE 
    trainset_record RECORD;
    job_number TEXT;
    counter INTEGER := 1;
BEGIN
    FOR trainset_record IN SELECT id, "trainsetNumber" FROM "trainsets" LIMIT 5
    LOOP
        job_number := 'JC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(counter::TEXT, 4, '0');
        
        INSERT INTO "job_cards" (
            "trainsetId",
            "jobCardNumber",
            "priority",
            "status",
            "workType",
            "description",
            "estimatedHours",
            "scheduledDate"
        ) VALUES (
            trainset_record.id,
            job_number,
            CASE (RANDOM() * 5)::INTEGER
                WHEN 0 THEN 'LOW'::job_priority
                WHEN 1 THEN 'MEDIUM'::job_priority
                WHEN 2 THEN 'HIGH'::job_priority
                WHEN 3 THEN 'CRITICAL'::job_priority
                ELSE 'EMERGENCY'::job_priority
            END,
            CASE (RANDOM() * 4)::INTEGER
                WHEN 0 THEN 'PENDING'::job_status
                WHEN 1 THEN 'IN_PROGRESS'::job_status
                WHEN 2 THEN 'COMPLETED'::job_status
                ELSE 'ON_HOLD'::job_status
            END,
            CASE (RANDOM() * 4)::INTEGER
                WHEN 0 THEN 'Brake System Maintenance'
                WHEN 1 THEN 'HVAC Service'
                WHEN 2 THEN 'Door System Inspection'
                ELSE 'Propulsion System Check'
            END,
            'Scheduled maintenance work as per preventive maintenance plan',
            4 + (RANDOM() * 8)::NUMERIC,
            CURRENT_DATE + INTERVAL '1 day' * (RANDOM() * 30)::INTEGER
        );
        
        counter := counter + 1;
    END LOOP;
END $$;

-- Insert sample maintenance records
DO $$
DECLARE 
    trainset_record RECORD;
BEGIN
    FOR trainset_record IN SELECT id FROM "trainsets" LIMIT 3
    LOOP
        INSERT INTO "maintenance_records" (
            "trainsetId",
            "type",
            "description",
            "performedBy",
            "performedAt",
            "nextDueDate",
            "cost",
            "notes"
        ) VALUES (
            trainset_record.id,
            'PREVENTIVE'::maintenance_type,
            'Monthly preventive maintenance check',
            'Maintenance Team A',
            CURRENT_TIMESTAMP - INTERVAL '15 days',
            CURRENT_DATE + INTERVAL '1 month',
            15000 + (RANDOM() * 10000)::NUMERIC,
            'All systems checked and found operational'
        );
    END LOOP;
END $$;

-- Insert sample branding records
DO $$
DECLARE 
    trainset_record RECORD;
BEGIN
    FOR trainset_record IN SELECT id FROM "trainsets" LIMIT 2
    LOOP
        INSERT INTO "branding_records" (
            "trainsetId",
            "brandName",
            "campaignId",
            "startDate",
            "endDate",
            "priority",
            "exposureTarget",
            "revenue",
            "status"
        ) VALUES (
            trainset_record.id,
            'Kerala Tourism',
            'KT-2024-001',
            CURRENT_DATE - INTERVAL '30 days',
            CURRENT_DATE + INTERVAL '60 days',
            1,
            1000,
            750.5,
            'ACTIVE'::branding_status
        );
    END LOOP;
END $$;

-- Insert sample mileage records (last 7 days)
DO $$
DECLARE 
    trainset_record RECORD;
    record_date DATE;
BEGIN
    FOR trainset_record IN SELECT id FROM "trainsets"
    LOOP
        FOR i IN 0..6 LOOP
            record_date := CURRENT_DATE - INTERVAL '1 day' * i;
            
            INSERT INTO "mileage_records" (
                "trainsetId",
                "date",
                "startMileage",
                "endMileage",
                "distance"
            ) VALUES (
                trainset_record.id,
                record_date,
                100 + (RANDOM() * 50)::NUMERIC,
                150 + (RANDOM() * 100)::NUMERIC,
                50 + (RANDOM() * 100)::NUMERIC
            );
        END LOOP;
    END LOOP;
END $$;

-- Create initial notification for admin
DO $$
DECLARE 
    admin_user_id TEXT;
BEGIN
    SELECT id INTO admin_user_id FROM "users" WHERE email = 'admin@kmrl.gov.in';
    
    INSERT INTO "notifications" ("userId", "type", "title", "message", "priority") VALUES
    (admin_user_id, 'SUCCESS', 'System Initialization Complete', 
     'KMRL Train Induction System has been successfully initialized with sample data. Please review the configuration and update the default admin password.', 
     2);
END $$;
