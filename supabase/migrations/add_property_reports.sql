-- Create property_reports table
CREATE TABLE IF NOT EXISTS property_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Property information
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    -- Analysis results (stored as JSONB for flexibility)
    analysis_data JSONB NOT NULL,

    -- Captured images (array of image data URLs)
    captured_images JSONB,
    satellite_views JSONB,

    -- Structured data extracted from analysis
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

    -- User summary and detailed analysis
    user_summary TEXT,
    detailed_analysis TEXT,

    -- Solar metrics (if available)
    solar_metrics JSONB,

    -- Debug information
    debug_info JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes for common queries
    CONSTRAINT property_reports_user_id_workspace_id_key UNIQUE (user_id, workspace_id, created_at)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS property_reports_user_id_idx ON property_reports(user_id);
CREATE INDEX IF NOT EXISTS property_reports_workspace_id_idx ON property_reports(workspace_id);
CREATE INDEX IF NOT EXISTS property_reports_created_at_idx ON property_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS property_reports_address_idx ON property_reports(address);

-- Enable RLS
ALTER TABLE property_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own property reports"
    ON property_reports
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own property reports"
    ON property_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own property reports"
    ON property_reports
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own property reports"
    ON property_reports
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_property_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_reports_updated_at
    BEFORE UPDATE ON property_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_property_reports_updated_at();
