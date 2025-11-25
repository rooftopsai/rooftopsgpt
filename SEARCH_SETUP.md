# RAG Document System Setup Guide

## Overview
This system provides:
- **RAG (Retrieval Augmented Generation)**: Search through your uploaded PDF/TXT documents using AI embeddings
- **Hybrid Document Model**:
  - **Workspace-specific documents**: Users can upload documents for their own workspace
  - **Global documents**: Admins can upload documents accessible across all workspaces

## Setup Instructions

### 1. Environment Variables

Add to your `.env.local`:

```bash
# Brave Search API (get free key at https://brave.com/search/api/)
BRAVE_SEARCH_API_KEY=your_brave_api_key_here

# OpenAI API (for embeddings - you should already have this)
OPENAI_API_KEY=your_openai_key_here
```

### 2. Run Database Migrations

Run the Supabase migrations to create the document tables:

```bash
# Apply all migrations
supabase db push
```

Or apply manually in Supabase dashboard by running the SQL from:
1. `supabase/migrations/create_document_rag.sql` - Initial RAG tables
2. `supabase/migrations/add_global_documents.sql` - Adds global document support

### 3. Create Storage Bucket

In your Supabase dashboard:
1. Go to Storage
2. Create a new bucket called "documents"
3. Make it public (or configure RLS policies)

### 4. How to Use

#### Upload Workspace Documents

```typescript
const formData = new FormData()
formData.append("file", pdfFile) // File object
formData.append("workspaceId", workspaceId)
formData.append("title", "Optional Title")

const response = await fetch("/api/documents/upload", {
  method: "POST",
  body: formData
})
```

#### Upload Global Documents (Admin Only)

```typescript
const formData = new FormData()
formData.append("file", pdfFile) // File object
formData.append("title", "Optional Title")

const response = await fetch("/api/documents/admin/upload", {
  method: "POST",
  body: formData
})
// Global documents are automatically accessible to all workspaces
```

#### Search Documents (RAG)

The search automatically includes both workspace-specific AND global documents:

```typescript
import { searchDocuments } from "@/lib/search-tools"

const results = await searchDocuments(
  "What are the installation requirements for GAF shingles?",
  workspaceId,
  0.7, // similarity threshold
  5    // max results
)
// Returns results from both workspace documents and global documents
// Results include an 'is_global' flag to indicate the document type
```

#### Search Manufacturer Sites (Brave)

```typescript
import { searchManufacturerSites } from "@/lib/search-tools"

const results = await searchManufacturerSites(
  "GAF Timberline HDZ specifications",
  ["gaf.com", "owenscorning.com"] // optional, defaults to major manufacturers
)
```

#### Combined Search

```typescript
import { searchAll } from "@/lib/search-tools"

const { documents, webResults } = await searchAll(
  "roof ventilation requirements",
  workspaceId
)

// documents: Your uploaded PDFs with relevant content
// webResults: Live web search results from manufacturer sites
```

## Integration with Chat

To integrate with your chat system, you can:

1. **Add as a tool in Anthropic**: Pass search results as context
2. **Pre-search before sending to LLM**: Automatically search docs/web before responding
3. **User-triggered**: Add a "Search Documents" button

### Example: Add to Chat Handler

```typescript
// In your chat handler, before sending to Anthropic:
const { documents, webResults } = await searchAll(userMessage, workspaceId)

const context = `
Relevant Documents:
${documents.map(d => `- ${d.document_title}: ${d.content}`).join("\n")}

Web Results:
${webResults.map(r => `- ${r.title} (${r.url}): ${r.description}`).join("\n")}
`

// Add context to your Anthropic request
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  messages: [
    { role: "user", content: `${context}\n\nUser Question: ${userMessage}` }
  ]
})
```

## Supported File Types

- PDF (`.pdf`)
- Plain Text (`.txt`)

More formats can be added by extending the upload handler.

## Manufacturers Configured

Default manufacturers for Brave Search:
- GAF (gaf.com)
- Owens Corning (owenscorning.com)
- CertainTeed (certainteed.com)

You can add more in the `searchManufacturerSites` function.

## Cost Considerations

- **OpenAI Embeddings**: ~$0.0001 per 1K tokens
- **Brave Search**: Free tier includes 2,000 queries/month
- **Supabase**: Storage and database usage based on your plan

## Troubleshooting

### "Failed to search documents"
- Ensure migration was run successfully
- Check that pgvector extension is enabled in Supabase

### "Brave Search API key not configured"
- Add `BRAVE_SEARCH_API_KEY` to your `.env.local`
- Restart your dev server

### "Failed to upload file"
- Ensure "documents" storage bucket exists in Supabase
- Check storage bucket permissions/RLS policies
