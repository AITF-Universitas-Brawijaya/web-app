CREATE TABLE IF NOT EXISTS crawling_data (
    id_crawling SERIAL PRIMARY KEY,
    url TEXT,
    title VARCHAR(255),
    description TEXT,
    keywords TEXT,
    image_path TEXT,
    date_crawled TIMESTAMPTZ DEFAULT now(),
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS reasoning (
    id_reasoning SERIAL PRIMARY KEY,
    id_crawling INT NOT NULL REFERENCES crawling_data(id_crawling) ON DELETE CASCADE,
    label BOOLEAN,
    context TEXT,
    confidence_score NUMERIC(5,4),
    model_version TEXT,
    processed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (id_crawling)
);

CREATE TABLE IF NOT EXISTS object_detection (
    id_detection SERIAL PRIMARY KEY,
    id_crawling INT NOT NULL REFERENCES crawling_data(id_crawling) ON DELETE CASCADE,
    label BOOLEAN,
    confidence_score NUMERIC(5,4),
    image_detected_path VARCHAR(512),
    bounding_box JSONB,
    model_version TEXT,
    processed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (id_crawling)
);

CREATE TABLE IF NOT EXISTS results (
    id_results SERIAL PRIMARY KEY,
    id_crawling INT NOT NULL REFERENCES crawling_data(id_crawling) ON DELETE CASCADE,
    id_reasoning INT REFERENCES reasoning(id_reasoning),
    id_detection INT REFERENCES object_detection(id_detection),
    url TEXT,
    keywords TEXT,
    reasoning_text TEXT,
    image_final_path VARCHAR(512),
    label_final BOOLEAN,
    final_confidence NUMERIC(5,4),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (id_crawling)
);

CREATE INDEX IF NOT EXISTS idx_results_conf ON results(final_confidence);