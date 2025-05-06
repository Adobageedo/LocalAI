-- Example migration for Supabase (Postgres)
-- This creates a documents table for storing metadata about ingested documents

create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    doc_id text not null unique,
    document_type text,
    source_path text,
    attachment_name text,
    subject text,
    sender text,
    receiver text,
    date timestamptz,
    user_id text,
    created_at timestamptz default now()
);

-- Add more tables or indexes as needed for your use case
