-- Migration: Add feedback table
-- Description: Create table to store user feedback messages

CREATE TABLE IF NOT EXISTS feedback (
    id_feedback SERIAL PRIMARY KEY,
    messages TEXT NOT NULL,
    sender VARCHAR(100) NOT NULL,
    waktu_pengiriman TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries by sender
CREATE INDEX IF NOT EXISTS idx_feedback_sender ON feedback(sender);

-- Create index for faster queries by timestamp
CREATE INDEX IF NOT EXISTS idx_feedback_waktu ON feedback(waktu_pengiriman DESC);
