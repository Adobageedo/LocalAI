-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    phone VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    sources JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track API usage, token consumption, and costs
CREATE TABLE IF NOT EXISTS usage_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    tokens_used INTEGER NOT NULL DEFAULT 0,
    cost DECIMAL(10, 6),
    duration_ms INTEGER,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- General audit log for important system events
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id TEXT,
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    chat_settings JSONB NOT NULL DEFAULT '{"temperature": 0.7, "model": "gpt-3.5-turbo", "useRetrieval": true, "useUserContext": false}',
    ui_preferences JSONB NOT NULL DEFAULT '{"theme": "light", "fontSize": "medium"}',
    default_sources TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);

-- Add comment to tables and columns for documentation
COMMENT ON TABLE users IS 'Stores user profile information';
COMMENT ON TABLE conversations IS 'Stores chat conversation metadata';
COMMENT ON TABLE chat_messages IS 'Stores individual chat messages within conversations';

-- Synchronization status tracking for users
CREATE TABLE IF NOT EXISTS sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,  -- 'gmail', 'nextcloud', 'outlook', etc.
    last_sync_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_successful_sync TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'failed'
    items_processed INTEGER NOT NULL DEFAULT 0,
    items_succeeded INTEGER NOT NULL DEFAULT 0,
    items_failed INTEGER NOT NULL DEFAULT 0,
    error_details TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for efficient querying of sync status by user
CREATE INDEX idx_sync_status_user_id ON sync_status(user_id);
-- Add compound index for finding specific source types per user
CREATE INDEX idx_sync_status_user_source ON sync_status(user_id, source_type);

COMMENT ON TABLE sync_status IS 'Tracks synchronization status for user data sources';
