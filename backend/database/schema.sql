CREATE TABLE IF NOT EXISTS generated_domains (
    id_domain SERIAL PRIMARY KEY,
    url TEXT,
    title VARCHAR(255),
    domain VARCHAR(255),
    image_path TEXT,
    date_generated TIMESTAMPTZ DEFAULT now(),
    is_dummy BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS reasoning (
    id_reasoning SERIAL PRIMARY KEY,
    id_domain INT NOT NULL REFERENCES generated_domains(id_domain) ON DELETE CASCADE,
    label BOOLEAN,
    context TEXT,
    confidence_score NUMERIC(4,1),
    model_version TEXT,
    processed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (id_domain)
);

CREATE TABLE IF NOT EXISTS object_detection (
    id_detection TEXT PRIMARY KEY,
    id_domain INT NOT NULL REFERENCES generated_domains(id_domain) ON DELETE CASCADE,
    label BOOLEAN,
    confidence_score NUMERIC(4,1),
    image_detected_path VARCHAR(512),
    bounding_box JSONB,
    ocr JSONB,
    model_version TEXT,
    processed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (id_domain)
);

CREATE TABLE IF NOT EXISTS results (
    id_results SERIAL PRIMARY KEY,
    id_domain INT NOT NULL REFERENCES generated_domains(id_domain) ON DELETE CASCADE,
    id_reasoning INT REFERENCES reasoning(id_reasoning),
    id_detection TEXT REFERENCES object_detection(id_detection),
    url TEXT,
    keywords TEXT,
    reasoning_text TEXT,
    image_final_path VARCHAR(512),
    label_final BOOLEAN,
    final_confidence NUMERIC(4,1),
    status VARCHAR(20) DEFAULT 'unverified',
    flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    modified_by VARCHAR(100),
    modified_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE (id_domain)
);

CREATE INDEX IF NOT EXISTS idx_results_conf ON results(final_confidence);