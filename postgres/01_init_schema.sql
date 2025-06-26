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
    progress NUMERIC(5, 4) NOT NULL DEFAULT 0.0,  -- from 0.0000 to 1.0000
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'failed'
    error_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (user_id, source_type)
);

-- Add index for efficient querying of sync status by user
CREATE INDEX idx_sync_status_user_id ON sync_status(user_id);
-- Add compound index for finding specific source types per user
CREATE INDEX idx_sync_status_user_source ON sync_status(user_id, source_type);

COMMENT ON TABLE sync_status IS 'Tracks synchronization status for user data sources';
-- Table to store email content with user-specific information
CREATE TABLE IF NOT EXISTS email_content (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,  -- Username/Email of the associated user
    email_id VARCHAR(255) NOT NULL,  -- Unique email identifier (Message-ID)
    conversation_id VARCHAR(255),    -- Thread/Conversation ID
    sender VARCHAR(255) NOT NULL,    -- Email address of the sender
    recipients JSONB NOT NULL,       -- Array of recipient email addresses
    subject TEXT,                    -- Email subject
    body TEXT,                       -- Email body content
    html_body TEXT,                  -- HTML version of the email body (if available)
    sent_date TIMESTAMP NOT NULL,    -- When the email was sent
    received_date TIMESTAMP,         -- When the email was received
    folder VARCHAR(50) NOT NULL,                    -- Email labels/folders
    attachments JSONB,               -- Information about attachments
    source_type VARCHAR(50) NOT NULL, -- Type of email source (gmail, outlook, imap, etc.)
    doc_id UUID,                     -- Reference to the document ID in Qdrant if ingested
    metadata JSONB,                  -- Additional metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_email_content UNIQUE(user_id, email_id, source_type)
);

-- Indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_email_content_user_id ON email_content(user_id);
CREATE INDEX IF NOT EXISTS idx_email_content_conversation_id ON email_content(conversation_id);
CREATE INDEX IF NOT EXISTS idx_email_content_sent_date ON email_content(sent_date);