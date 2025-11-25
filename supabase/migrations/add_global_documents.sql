-- Add is_global flag to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;

-- Make workspace_id nullable for global documents
ALTER TABLE documents
ALTER COLUMN workspace_id DROP NOT NULL;

-- Add index for global documents
CREATE INDEX IF NOT EXISTS idx_documents_global ON documents(is_global);

-- Update RLS policies to allow reading global documents
-- Drop existing select policy
drop policy if exists "Users can read their own documents" on documents;

-- Create new policy that allows reading both workspace-specific AND global documents
create policy "Users can read workspace or global documents"
on documents for select
using (
  workspace_id = auth.uid() OR is_global = true
);

-- Update the search function to include global documents
create or replace function search_documents(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  filter_workspace_id uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  metadata jsonb,
  document_title text,
  file_name text,
  is_global boolean
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.metadata,
    d.title as document_title,
    d.file_name,
    d.is_global
  from document_chunks dc
  join documents d on dc.document_id = d.id
  where
    (filter_workspace_id is null or d.workspace_id = filter_workspace_id or d.is_global = true)
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Add RLS policy for admin to insert global documents
-- Create new policy for inserting global documents (only for admin/service role)
create policy "Service role can insert global documents"
on documents for insert
with check (
  auth.role() = 'service_role' OR
  (workspace_id = auth.uid() and is_global = false)
);

-- Update existing insert policy name for clarity
drop policy if exists "Users can insert their own documents" on documents;

create policy "Users can insert workspace documents"
on documents for insert
with check (
  workspace_id = auth.uid() and is_global = false
);

-- Update storage policies to allow global document uploads
-- Note: Global documents will be stored in a special "global" folder
