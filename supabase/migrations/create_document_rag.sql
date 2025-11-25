-- Enable pgvector extension
create extension if not exists vector;

-- Create documents table for RAG
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  title text not null,
  content text not null,
  file_name text,
  file_type text,
  file_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create document chunks table (for splitting large docs)
create table if not exists public.document_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.documents(id) on delete cascade not null,
  content text not null,
  embedding vector(1536), -- OpenAI ada-002 embeddings are 1536 dimensions
  chunk_index integer not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Create index for similarity search
create index if not exists document_chunks_embedding_idx
  on public.document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create index for document lookups
create index if not exists document_chunks_document_id_idx
  on public.document_chunks(document_id);

-- Enable RLS
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

-- RLS Policies for documents
create policy "Users can view documents in their workspace"
  on public.documents for select
  using (
    workspace_id in (
      select workspace_id from public.workspaces
      where user_id = auth.uid()
    )
  );

create policy "Users can insert documents in their workspace"
  on public.documents for insert
  with check (
    workspace_id in (
      select workspace_id from public.workspaces
      where user_id = auth.uid()
    )
  );

create policy "Users can update their documents"
  on public.documents for update
  using (user_id = auth.uid());

create policy "Users can delete their documents"
  on public.documents for delete
  using (user_id = auth.uid());

-- RLS Policies for document_chunks
create policy "Users can view chunks in their workspace"
  on public.document_chunks for select
  using (
    document_id in (
      select id from public.documents
      where workspace_id in (
        select workspace_id from public.workspaces
        where user_id = auth.uid()
      )
    )
  );

create policy "Users can insert chunks"
  on public.document_chunks for insert
  with check (
    document_id in (
      select id from public.documents
      where user_id = auth.uid()
    )
  );

-- Function to search documents by similarity
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
  metadata jsonb
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
    dc.metadata
  from document_chunks dc
  join documents d on dc.document_id = d.id
  where
    (filter_workspace_id is null or d.workspace_id = filter_workspace_id)
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
