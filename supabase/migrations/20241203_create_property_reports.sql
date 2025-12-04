-- Create property_reports table
CREATE TABLE IF NOT EXISTS property_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    -- Full analysis data stored as JSONB
    analysis_data JSONB NOT NULL,
    captured_images JSONB,
    satellite_views JSONB,
    solar_metrics JSONB,
    debug_info JSONB,

    -- Extracted structured fields for easy querying
    facet_count INTEGER,
    roof_area DOUBLE PRECISION,
    roof_area_range JSONB,
    squares INTEGER,
    pitch TEXT,
    ridge_length DOUBLE PRECISION,
    valley_length DOUBLE PRECISION,
    complexity TEXT,
    confidence TEXT,
    material TEXT,
    condition TEXT,
    user_summary TEXT,
    detailed_analysis TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id and workspace_id for faster queries
CREATE INDEX IF NOT EXISTS idx_property_reports_user_workspace
    ON property_reports(user_id, workspace_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_property_reports_created_at
    ON property_reports(created_at DESC);

-- Enable RLS
ALTER TABLE property_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own property reports" ON property_reports;
DROP POLICY IF EXISTS "Users can create their own property reports" ON property_reports;
DROP POLICY IF EXISTS "Users can update their own property reports" ON property_reports;
DROP POLICY IF EXISTS "Users can delete their own property reports" ON property_reports;

-- Create RLS policies
CREATE POLICY "Users can view their own property reports"
    ON property_reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own property reports"
    ON property_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own property reports"
    ON property_reports FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own property reports"
    ON property_reports FOR DELETE
    USING (auth.uid() = user_id);
