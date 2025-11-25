-- Add metadata column to messages table for storing document source information
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata TEXT;

-- Add an index for better query performance when filtering by metadata
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING gin ((metadata::jsonb));
