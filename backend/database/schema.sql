-- Database Schema for PRD Dashboard Chatbot
-- Auto-generated from actual database structure
-- This schema includes user authentication and Row Level Security (RLS)

-- Table: app_users
CREATE TABLE IF NOT EXISTS app_users (
    id_user SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: generated_domains
CREATE TABLE IF NOT EXISTS generated_domains (
    id_domain SERIAL PRIMARY KEY,
    url TEXT,
    title VARCHAR(255),
    domain VARCHAR(255),
    image_path TEXT,
    date_generated TIMESTAMPTZ DEFAULT now(),
    status VARCHAR(20) DEFAULT 'pending'::character varying,
    is_dummy BOOLEAN DEFAULT false,
    user_id INTEGER NOT NULL REFERENCES app_users(id_user) ON DELETE CASCADE
);

-- Table: history_log
CREATE TABLE IF NOT EXISTS history_log (
    id SERIAL PRIMARY KEY,
    id_result INTEGER NOT NULL,
    time TIMESTAMPTZ DEFAULT now(),
    text TEXT NOT NULL
);

-- Table: object_detection
CREATE TABLE IF NOT EXISTS object_detection (
    id_detection TEXT NOT NULL,
    id_domain INTEGER NOT NULL REFERENCES generated_domains(id_domain) ON DELETE CASCADE UNIQUE,
    label BOOLEAN,
    confidence_score NUMERIC,
    image_detected_path VARCHAR(512),
    bounding_box JSONB,
    ocr JSONB,
    model_version TEXT,
    processed_at TIMESTAMPTZ DEFAULT now(),
    user_id INTEGER NOT NULL REFERENCES app_users(id_user) ON DELETE CASCADE
);

-- Table: reasoning
CREATE TABLE IF NOT EXISTS reasoning (
    id_reasoning SERIAL PRIMARY KEY,
    id_domain INTEGER NOT NULL REFERENCES generated_domains(id_domain) ON DELETE CASCADE UNIQUE,
    label BOOLEAN,
    context TEXT,
    confidence_score NUMERIC,
    model_version TEXT,
    processed_at TIMESTAMPTZ DEFAULT now(),
    user_id INTEGER NOT NULL REFERENCES app_users(id_user) ON DELETE CASCADE
);

-- Table: results
CREATE TABLE IF NOT EXISTS results (
    id_results SERIAL PRIMARY KEY,
    id_domain INTEGER NOT NULL REFERENCES generated_domains(id_domain) ON DELETE CASCADE UNIQUE,
    id_reasoning INTEGER REFERENCES reasoning(id_reasoning) ON DELETE CASCADE,
    id_detection TEXT REFERENCES object_detection(id_detection) ON DELETE CASCADE,
    url TEXT,
    keywords TEXT,
    reasoning_text TEXT,
    image_final_path VARCHAR(512),
    label_final BOOLEAN,
    final_confidence NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    modified_by VARCHAR(100),
    modified_at TIMESTAMPTZ,
    user_id INTEGER NOT NULL REFERENCES app_users(id_user) ON DELETE CASCADE
);


-- Enable Row Level Security (RLS) on data tables
ALTER TABLE generated_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasoning ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data

-- Policy for generated_domains
CREATE POLICY generated_domains_user_isolation ON generated_domains
    USING (user_id::text = current_setting('app.current_user_id', true));


-- Policy for reasoning
CREATE POLICY reasoning_user_isolation ON reasoning
    USING (user_id::text = current_setting('app.current_user_id', true));


-- Policy for object_detection
CREATE POLICY object_detection_user_isolation ON object_detection
    USING (user_id::text = current_setting('app.current_user_id', true));


-- Policy for results
CREATE POLICY results_user_isolation ON results
    USING (user_id::text = current_setting('app.current_user_id', true));


-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_results_conf ON results(final_confidence);
CREATE INDEX IF NOT EXISTS idx_generated_domains_user ON generated_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_results_user ON results(user_id);