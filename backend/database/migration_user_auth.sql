-- Migration: User Authentication & Audit System
-- Created: 2025-12-06
-- Description: Add users table, audit_log table, and update results table for user tracking

-- ============================================================
-- 1. Create users table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('verifikator', 'administrator')),
    created_at TIMESTAMPTZ DEFAULT now(),
    last_login TIMESTAMPTZ
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================================
-- 2. Create audit_log table
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    id_result INT NOT NULL REFERENCES results(id_results) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    details JSONB
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_log_result ON audit_log(id_result);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- ============================================================
-- 3. Alter results table - add user tracking columns
-- ============================================================

-- Add created_by column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'results' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE results ADD COLUMN created_by VARCHAR(50);
    END IF;
END $$;

-- Add verified_by column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'results' AND column_name = 'verified_by'
    ) THEN
        ALTER TABLE results ADD COLUMN verified_by VARCHAR(50);
    END IF;
END $$;

-- Add verified_at column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'results' AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE results ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;
END $$;

-- Update modified_by to match username length (from VARCHAR(100) to VARCHAR(50))
DO $$ 
BEGIN
    ALTER TABLE results ALTER COLUMN modified_by TYPE VARCHAR(50);
EXCEPTION
    WHEN others THEN
        -- Column might already be VARCHAR(50) or doesn't exist
        NULL;
END $$;

-- ============================================================
-- 4. Add foreign key constraints (after users table exists)
-- ============================================================

-- Add foreign key for created_by
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_results_created_by'
    ) THEN
        ALTER TABLE results 
        ADD CONSTRAINT fk_results_created_by 
        FOREIGN KEY (created_by) REFERENCES users(username) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key for verified_by
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_results_verified_by'
    ) THEN
        ALTER TABLE results 
        ADD CONSTRAINT fk_results_verified_by 
        FOREIGN KEY (verified_by) REFERENCES users(username) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key for modified_by
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_results_modified_by'
    ) THEN
        ALTER TABLE results 
        ADD CONSTRAINT fk_results_modified_by 
        FOREIGN KEY (modified_by) REFERENCES users(username) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key for audit_log username
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_audit_log_username'
    ) THEN
        ALTER TABLE audit_log 
        ADD CONSTRAINT fk_audit_log_username 
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================
-- 5. Insert dummy users for testing
-- ============================================================

-- Password for all users: "password123"
-- Hash generated with bcrypt (rounds=12)
-- You can generate new hashes in Python with:
-- from passlib.context import CryptContext
-- pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
-- print(pwd_context.hash("password123"))

INSERT INTO users (username, password_hash, full_name, email, phone, role, created_at)
VALUES 
    ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/1jrYu', 'Administrator', 'admin@example.com', '081234567890', 'administrator', now()),
    ('verif1', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/1jrYu', 'Verifikator Satu', 'verif1@example.com', '081234567891', 'verifikator', now()),
    ('verif2', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/1jrYu', 'Verifikator Dua', 'verif2@example.com', '081234567892', 'verifikator', now()),
    ('verif3', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/1jrYu', 'Verifikator Tiga', NULL, NULL, 'verifikator', now())
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- Migration Complete
-- ============================================================

-- Verify tables created
SELECT 'Users table created' as status, count(*) as user_count FROM users;
SELECT 'Audit log table created' as status, count(*) as log_count FROM audit_log;
SELECT 'Results table updated' as status FROM results LIMIT 1;
