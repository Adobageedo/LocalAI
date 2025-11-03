-- Create tone_profiles table for storing user email style analyses
CREATE TABLE IF NOT EXISTS tone_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('outlook', 'gmail')),
    style_analysis TEXT NOT NULL,
    email_count INTEGER NOT NULL DEFAULT 0,
    analysis_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Create unique constraint to prevent duplicate profiles per user/provider
    UNIQUE(user_id, provider)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tone_profiles_user_id ON tone_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tone_profiles_provider ON tone_profiles(provider);
CREATE INDEX IF NOT EXISTS idx_tone_profiles_created_at ON tone_profiles(created_at);

-- Add comments for documentation
COMMENT ON TABLE tone_profiles IS 'Stores AI-generated style analysis profiles for user email writing patterns';
COMMENT ON COLUMN tone_profiles.user_id IS 'Firebase user ID or unique user identifier';
COMMENT ON COLUMN tone_profiles.provider IS 'Email provider used for analysis (outlook or gmail)';
COMMENT ON COLUMN tone_profiles.style_analysis IS 'LLM-generated narrative description of user writing style';
COMMENT ON COLUMN tone_profiles.email_count IS 'Number of emails analyzed to create this profile';
COMMENT ON COLUMN tone_profiles.analysis_date IS 'Date when the style analysis was performed';
