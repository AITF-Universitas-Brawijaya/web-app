-- Migration: Chat History Storage
-- Created: 2025-12-09
-- Description: Add chat_history table for storing per-user chat conversations

-- ============================================================
-- 1. Create chat_history table
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    id_domain INT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_chat_user FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
    CONSTRAINT fk_chat_domain FOREIGN KEY (id_domain) REFERENCES generated_domains(id_domain) ON DELETE CASCADE
);

-- ============================================================
-- 2. Create indexes for faster queries
-- ============================================================
-- Index for retrieving chat history by user and domain
CREATE INDEX IF NOT EXISTS idx_chat_history_user_domain ON chat_history(username, id_domain, created_at);

-- Index for retrieving recent chats
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);

-- ============================================================
-- Migration Complete
-- ============================================================

-- Verify table created
SELECT 'Chat history table created' as status, count(*) as message_count FROM chat_history;
