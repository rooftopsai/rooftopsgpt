-- Migration: AI Employee Platform for Rooftops AI
-- This creates the full CRM, job management, crew scheduling, invoicing,
-- and communication infrastructure for the 24/7 AI Employee feature.

-- ============================================================================
-- CUSTOMERS / CRM
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Contact Info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  secondary_phone TEXT,

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Status & Source
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'customer', 'inactive', 'do_not_contact')),
  source TEXT CHECK (source IN ('web_form', 'referral', 'home_advisor', 'angi', 'storm_lead', 'door_knock', 'cold_call', 'google', 'facebook', 'other')),
  source_details TEXT,

  -- Assignment
  assigned_to UUID REFERENCES profiles(user_id) ON DELETE SET NULL,

  -- Additional Info
  notes TEXT,
  tags TEXT[],
  property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'multi_family', 'industrial')),

  -- Communication Preferences
  preferred_contact_method TEXT DEFAULT 'phone' CHECK (preferred_contact_method IN ('phone', 'sms', 'email', 'any')),
  do_not_call BOOLEAN DEFAULT FALSE,
  do_not_text BOOLEAN DEFAULT FALSE,
  do_not_email BOOLEAN DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for customers
CREATE INDEX customers_workspace_id_idx ON customers(workspace_id);
CREATE INDEX customers_status_idx ON customers(status);
CREATE INDEX customers_phone_idx ON customers(phone);
CREATE INDEX customers_email_idx ON customers(email);
CREATE INDEX customers_assigned_to_idx ON customers(assigned_to);
CREATE INDEX customers_created_at_idx ON customers(created_at DESC);
CREATE INDEX customers_source_idx ON customers(source);

-- Trigger for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers in their workspace" ON customers
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert customers in their workspace" ON customers
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update customers in their workspace" ON customers
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete customers in their workspace" ON customers
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all customers" ON customers
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- CREWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Crew Info
  name TEXT NOT NULL,
  leader_name TEXT,
  phone TEXT,
  email TEXT,

  -- Skills & Capacity
  skills TEXT[] DEFAULT '{}', -- residential, commercial, steep_slope, flat, metal, tile, etc.
  max_jobs_per_day INTEGER DEFAULT 1,
  typical_crew_size INTEGER DEFAULT 3,

  -- Service Area
  service_radius_miles INTEGER DEFAULT 50,
  home_location_lat DECIMAL(10, 8),
  home_location_lng DECIMAL(11, 8),
  home_address TEXT,

  -- Status
  active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  -- Metadata
  hourly_rate DECIMAL(10, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for crews
CREATE INDEX crews_workspace_id_idx ON crews(workspace_id);
CREATE INDEX crews_active_idx ON crews(active);

-- Trigger for updated_at
CREATE TRIGGER update_crews_updated_at
  BEFORE UPDATE ON crews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for crews
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view crews in their workspace" ON crews
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert crews in their workspace" ON crews
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update crews in their workspace" ON crews
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete crews in their workspace" ON crews
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all crews" ON crews
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- CREW AVAILABILITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS crew_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  start_time TIME,
  end_time TIME,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(crew_id, date)
);

-- Indexes for crew_availability
CREATE INDEX crew_availability_crew_id_idx ON crew_availability(crew_id);
CREATE INDEX crew_availability_date_idx ON crew_availability(date);
CREATE INDEX crew_availability_available_idx ON crew_availability(available);

-- RLS for crew_availability
ALTER TABLE crew_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view crew availability for their crews" ON crew_availability
  FOR SELECT USING (
    crew_id IN (SELECT id FROM crews WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can manage crew availability for their crews" ON crew_availability
  FOR ALL USING (
    crew_id IN (SELECT id FROM crews WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Service role can manage all crew availability" ON crew_availability
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- JOBS / PROJECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Job Info
  title TEXT NOT NULL,
  job_number TEXT, -- Company's internal job number
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Status & Type
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN (
    'lead', 'estimate_scheduled', 'estimate_sent', 'negotiating',
    'sold', 'materials_ordered', 'scheduled', 'in_progress',
    'complete', 'invoiced', 'paid', 'cancelled', 'on_hold'
  )),
  job_type TEXT CHECK (job_type IN (
    'roof_replacement', 'roof_repair', 'inspection', 'maintenance',
    'gutters', 'siding', 'windows', 'solar', 'insurance_claim', 'other'
  )),

  -- Roof Details
  roof_area_sqft INTEGER,
  roof_pitch TEXT,
  roof_layers INTEGER,
  current_material TEXT,
  new_material TEXT,

  -- Financials
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  material_cost DECIMAL(10, 2),
  labor_cost DECIMAL(10, 2),
  profit_margin DECIMAL(5, 2),

  -- Scheduling
  estimate_date TIMESTAMP WITH TIME ZONE,
  scheduled_date DATE,
  scheduled_time TIME,
  estimated_duration_days INTEGER DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Assignment
  crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
  salesperson_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,

  -- Insurance
  is_insurance_claim BOOLEAN DEFAULT FALSE,
  insurance_company TEXT,
  claim_number TEXT,
  adjuster_name TEXT,
  adjuster_phone TEXT,

  -- Additional
  notes TEXT,
  internal_notes TEXT,
  tags TEXT[],

  -- Property Report Reference
  property_report_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for jobs
CREATE INDEX jobs_workspace_id_idx ON jobs(workspace_id);
CREATE INDEX jobs_customer_id_idx ON jobs(customer_id);
CREATE INDEX jobs_status_idx ON jobs(status);
CREATE INDEX jobs_crew_id_idx ON jobs(crew_id);
CREATE INDEX jobs_scheduled_date_idx ON jobs(scheduled_date);
CREATE INDEX jobs_created_at_idx ON jobs(created_at DESC);
CREATE INDEX jobs_job_type_idx ON jobs(job_type);

-- Trigger for updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view jobs in their workspace" ON jobs
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert jobs in their workspace" ON jobs
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update jobs in their workspace" ON jobs
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete jobs in their workspace" ON jobs
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all jobs" ON jobs
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Invoice Details
  invoice_number TEXT NOT NULL,
  description TEXT,

  -- Line Items stored as JSONB
  line_items JSONB DEFAULT '[]', -- [{description, quantity, unit_price, total}]

  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 4) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  balance_due DECIMAL(10, 2) NOT NULL,

  -- Status & Dates
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'refunded')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Payment Info
  payment_method TEXT CHECK (payment_method IN ('cash', 'check', 'credit_card', 'ach', 'financing', 'other')),
  payment_reference TEXT,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,

  -- Communication
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,
  internal_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for invoices
CREATE INDEX invoices_workspace_id_idx ON invoices(workspace_id);
CREATE INDEX invoices_job_id_idx ON invoices(job_id);
CREATE INDEX invoices_customer_id_idx ON invoices(customer_id);
CREATE INDEX invoices_status_idx ON invoices(status);
CREATE INDEX invoices_due_date_idx ON invoices(due_date);
CREATE INDEX invoices_invoice_number_idx ON invoices(invoice_number);

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices in their workspace" ON invoices
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage invoices in their workspace" ON invoices
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all invoices" ON invoices
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- FOLLOW-UP SEQUENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Sequence Info
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'new_lead', 'estimate_sent', 'estimate_viewed', 'no_response',
    'job_scheduled', 'job_complete', 'invoice_sent', 'invoice_overdue',
    'review_request', 'manual'
  )),

  -- Steps: [{day: 0, channel: 'sms', template: '...', subject: '...'}, ...]
  steps JSONB NOT NULL DEFAULT '[]',

  -- Settings
  active BOOLEAN DEFAULT TRUE,
  stop_on_reply BOOLEAN DEFAULT TRUE,
  stop_on_booking BOOLEAN DEFAULT TRUE,

  -- Stats
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for sequences
CREATE INDEX sequences_workspace_id_idx ON sequences(workspace_id);
CREATE INDEX sequences_trigger_type_idx ON sequences(trigger_type);
CREATE INDEX sequences_active_idx ON sequences(active);

-- Trigger for updated_at
CREATE TRIGGER update_sequences_updated_at
  BEFORE UPDATE ON sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for sequences
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sequences in their workspace" ON sequences
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage sequences in their workspace" ON sequences
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all sequences" ON sequences
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- SEQUENCE ENROLLMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Progress
  current_step INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'stopped', 'unsubscribed', 'converted')),

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  next_step_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  stopped_at TIMESTAMP WITH TIME ZONE,
  stop_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for sequence_enrollments
CREATE INDEX sequence_enrollments_sequence_id_idx ON sequence_enrollments(sequence_id);
CREATE INDEX sequence_enrollments_customer_id_idx ON sequence_enrollments(customer_id);
CREATE INDEX sequence_enrollments_job_id_idx ON sequence_enrollments(job_id);
CREATE INDEX sequence_enrollments_status_idx ON sequence_enrollments(status);
CREATE INDEX sequence_enrollments_next_step_at_idx ON sequence_enrollments(next_step_at);

-- Trigger for updated_at
CREATE TRIGGER update_sequence_enrollments_updated_at
  BEFORE UPDATE ON sequence_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for sequence_enrollments
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view enrollments for their sequences" ON sequence_enrollments
  FOR SELECT USING (
    sequence_id IN (SELECT id FROM sequences WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can manage enrollments for their sequences" ON sequence_enrollments
  FOR ALL USING (
    sequence_id IN (SELECT id FROM sequences WHERE workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid()))
  );

CREATE POLICY "Service role can manage all enrollments" ON sequence_enrollments
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- COMMUNICATIONS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Channel & Direction
  channel TEXT NOT NULL CHECK (channel IN ('voice', 'sms', 'email', 'whatsapp')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Contact Info
  from_number TEXT,
  to_number TEXT,
  from_email TEXT,
  to_email TEXT,

  -- Content
  subject TEXT,
  body TEXT,

  -- Voice-specific
  transcript TEXT,
  recording_url TEXT,
  duration_seconds INTEGER,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'queued', 'sent', 'delivered', 'read', 'failed',
    'answered', 'no_answer', 'busy', 'voicemail'
  )),
  error_message TEXT,

  -- External IDs
  twilio_sid TEXT,
  sendgrid_id TEXT,
  external_id TEXT,

  -- Sequence tracking
  sequence_enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE SET NULL,
  sequence_step INTEGER,

  -- AI Processing
  ai_summary TEXT,
  ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative')),
  ai_intent TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for communications
CREATE INDEX communications_workspace_id_idx ON communications(workspace_id);
CREATE INDEX communications_customer_id_idx ON communications(customer_id);
CREATE INDEX communications_job_id_idx ON communications(job_id);
CREATE INDEX communications_channel_idx ON communications(channel);
CREATE INDEX communications_direction_idx ON communications(direction);
CREATE INDEX communications_status_idx ON communications(status);
CREATE INDEX communications_created_at_idx ON communications(created_at DESC);
CREATE INDEX communications_twilio_sid_idx ON communications(twilio_sid);
CREATE INDEX communications_from_number_idx ON communications(from_number);
CREATE INDEX communications_to_number_idx ON communications(to_number);

-- RLS for communications
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view communications in their workspace" ON communications
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert communications in their workspace" ON communications
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all communications" ON communications
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- REVIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Review Details
  platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'yelp', 'bbb', 'angies_list', 'home_advisor', 'other')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  reviewer_name TEXT,

  -- Response
  response_text TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_status TEXT DEFAULT 'none' CHECK (response_status IN ('none', 'draft', 'published')),

  -- External
  external_id TEXT,
  external_url TEXT,

  -- Request tracking
  request_sent_at TIMESTAMP WITH TIME ZONE,
  request_clicked_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  review_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for reviews
CREATE INDEX reviews_workspace_id_idx ON reviews(workspace_id);
CREATE INDEX reviews_customer_id_idx ON reviews(customer_id);
CREATE INDEX reviews_job_id_idx ON reviews(job_id);
CREATE INDEX reviews_platform_idx ON reviews(platform);
CREATE INDEX reviews_rating_idx ON reviews(rating);
CREATE INDEX reviews_created_at_idx ON reviews(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews in their workspace" ON reviews
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage reviews in their workspace" ON reviews
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all reviews" ON reviews
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- DOCUMENTS / FILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- File Info
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  mime_type TEXT,

  -- Categorization
  document_type TEXT CHECK (document_type IN (
    'photo', 'contract', 'proposal', 'invoice', 'permit',
    'insurance_doc', 'warranty', 'inspection', 'receipt', 'other'
  )),
  phase TEXT CHECK (phase IN ('before', 'during', 'after', 'permit', 'insurance', 'other')),

  -- Metadata
  description TEXT,
  uploaded_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for job_documents
CREATE INDEX job_documents_workspace_id_idx ON job_documents(workspace_id);
CREATE INDEX job_documents_job_id_idx ON job_documents(job_id);
CREATE INDEX job_documents_customer_id_idx ON job_documents(customer_id);
CREATE INDEX job_documents_document_type_idx ON job_documents(document_type);
CREATE INDEX job_documents_phase_idx ON job_documents(phase);

-- RLS for job_documents
ALTER TABLE job_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their workspace" ON job_documents
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage documents in their workspace" ON job_documents
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all documents" ON job_documents
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- KNOWLEDGE BASE (with pgvector)
-- ============================================================================

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS workspace_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Content
  title TEXT,
  content TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('faq', 'pricing', 'process', 'policy', 'script', 'product', 'service', 'general')),

  -- Vector embedding for semantic search
  embedding vector(1536),

  -- Metadata
  tags TEXT[],
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for workspace_knowledge
CREATE INDEX workspace_knowledge_workspace_id_idx ON workspace_knowledge(workspace_id);
CREATE INDEX workspace_knowledge_content_type_idx ON workspace_knowledge(content_type);

-- Vector similarity search index
CREATE INDEX workspace_knowledge_embedding_idx ON workspace_knowledge
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Trigger for updated_at
CREATE TRIGGER update_workspace_knowledge_updated_at
  BEFORE UPDATE ON workspace_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for workspace_knowledge
ALTER TABLE workspace_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view knowledge in their workspace" ON workspace_knowledge
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage knowledge in their workspace" ON workspace_knowledge
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all knowledge" ON workspace_knowledge
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- PHONE NUMBERS (Twilio)
-- ============================================================================

CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Phone Info
  phone_number TEXT NOT NULL,
  friendly_name TEXT,

  -- Twilio
  twilio_sid TEXT NOT NULL,
  twilio_account_sid TEXT,

  -- Capabilities
  voice_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  mms_enabled BOOLEAN DEFAULT FALSE,

  -- Configuration
  type TEXT DEFAULT 'main' CHECK (type IN ('main', 'sales', 'support', 'marketing')),
  greeting_message TEXT,
  voicemail_enabled BOOLEAN DEFAULT TRUE,
  voicemail_greeting TEXT,

  -- Routing
  forward_to TEXT, -- Phone number to forward to if AI can't handle
  forward_after_hours BOOLEAN DEFAULT TRUE,
  business_hours_start TIME DEFAULT '08:00',
  business_hours_end TIME DEFAULT '18:00',
  timezone TEXT DEFAULT 'America/Chicago',

  -- Status
  active BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for phone_numbers
CREATE INDEX phone_numbers_workspace_id_idx ON phone_numbers(workspace_id);
CREATE INDEX phone_numbers_phone_number_idx ON phone_numbers(phone_number);
CREATE INDEX phone_numbers_twilio_sid_idx ON phone_numbers(twilio_sid);
CREATE INDEX phone_numbers_active_idx ON phone_numbers(active);

-- Trigger for updated_at
CREATE TRIGGER update_phone_numbers_updated_at
  BEFORE UPDATE ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for phone_numbers
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view phone numbers in their workspace" ON phone_numbers
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage phone numbers in their workspace" ON phone_numbers
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all phone numbers" ON phone_numbers
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- BACKGROUND JOBS (pg-boss tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Job Info
  job_type TEXT NOT NULL CHECK (job_type IN (
    'sequence_step', 'invoice_reminder', 'review_request',
    'weather_check', 'speed_to_lead', 'morning_briefing',
    'status_update', 'crew_notification'
  )),

  -- References
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  sequence_enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Results
  result JSONB,
  error TEXT,

  -- Processing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- pg-boss reference
  pgboss_job_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for background_jobs
CREATE INDEX background_jobs_workspace_id_idx ON background_jobs(workspace_id);
CREATE INDEX background_jobs_job_type_idx ON background_jobs(job_type);
CREATE INDEX background_jobs_status_idx ON background_jobs(status);
CREATE INDEX background_jobs_scheduled_for_idx ON background_jobs(scheduled_for);
CREATE INDEX background_jobs_customer_id_idx ON background_jobs(customer_id);

-- RLS for background_jobs
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view jobs in their workspace" ON background_jobs
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all background jobs" ON background_jobs
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- PRICING RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Rule Info
  name TEXT NOT NULL,
  description TEXT,

  -- Type
  rule_type TEXT NOT NULL CHECK (rule_type IN ('material', 'labor', 'addon', 'discount', 'markup')),

  -- Conditions
  material_type TEXT,
  job_type TEXT,
  roof_pitch_min TEXT,
  roof_pitch_max TEXT,
  min_sqft INTEGER,
  max_sqft INTEGER,

  -- Pricing
  price_per_sqft DECIMAL(10, 4),
  flat_price DECIMAL(10, 2),
  hourly_rate DECIMAL(10, 2),
  percentage DECIMAL(5, 4),

  -- Priority (higher = checked first)
  priority INTEGER DEFAULT 0,

  -- Status
  active BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for pricing_rules
CREATE INDEX pricing_rules_workspace_id_idx ON pricing_rules(workspace_id);
CREATE INDEX pricing_rules_rule_type_idx ON pricing_rules(rule_type);
CREATE INDEX pricing_rules_active_idx ON pricing_rules(active);

-- Trigger for updated_at
CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for pricing_rules
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pricing rules in their workspace" ON pricing_rules
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage pricing rules in their workspace" ON pricing_rules
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage all pricing rules" ON pricing_rules
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to search knowledge base by semantic similarity
CREATE OR REPLACE FUNCTION search_workspace_knowledge(
  p_workspace_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wk.id,
    wk.title,
    wk.content,
    wk.content_type,
    1 - (wk.embedding <=> p_query_embedding) AS similarity
  FROM workspace_knowledge wk
  WHERE wk.workspace_id = p_workspace_id
    AND 1 - (wk.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY wk.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- Function to get customer by phone (for inbound call/SMS lookup)
CREATE OR REPLACE FUNCTION get_customer_by_phone(
  p_workspace_id UUID,
  p_phone TEXT
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  customer_status TEXT,
  latest_job_id UUID,
  latest_job_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    c.status AS customer_status,
    j.id AS latest_job_id,
    j.status AS latest_job_status
  FROM customers c
  LEFT JOIN LATERAL (
    SELECT id, status
    FROM jobs
    WHERE customer_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) j ON TRUE
  WHERE c.workspace_id = p_workspace_id
    AND (c.phone = p_phone OR c.secondary_phone = p_phone)
  LIMIT 1;
END;
$$;

-- Function to get next available crew for a job
CREATE OR REPLACE FUNCTION get_available_crews(
  p_workspace_id UUID,
  p_date DATE,
  p_skills TEXT[] DEFAULT NULL,
  p_job_lat DECIMAL DEFAULT NULL,
  p_job_lng DECIMAL DEFAULT NULL
)
RETURNS TABLE (
  crew_id UUID,
  crew_name TEXT,
  leader_name TEXT,
  phone TEXT,
  skills TEXT[],
  distance_miles FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS crew_id,
    c.name AS crew_name,
    c.leader_name,
    c.phone,
    c.skills,
    CASE
      WHEN p_job_lat IS NOT NULL AND p_job_lng IS NOT NULL AND c.home_location_lat IS NOT NULL
      THEN (
        3959 * acos(
          cos(radians(p_job_lat)) * cos(radians(c.home_location_lat)) *
          cos(radians(c.home_location_lng) - radians(p_job_lng)) +
          sin(radians(p_job_lat)) * sin(radians(c.home_location_lat))
        )
      )
      ELSE NULL
    END AS distance_miles
  FROM crews c
  LEFT JOIN crew_availability ca ON c.id = ca.crew_id AND ca.date = p_date
  WHERE c.workspace_id = p_workspace_id
    AND c.active = TRUE
    AND (ca.available IS NULL OR ca.available = TRUE)
    AND (p_skills IS NULL OR c.skills && p_skills)
  ORDER BY distance_miles NULLS LAST;
END;
$$;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE customers IS 'CRM customer/lead records for each workspace';
COMMENT ON TABLE crews IS 'Roofing crews available for job assignments';
COMMENT ON TABLE crew_availability IS 'Daily availability calendar for crews';
COMMENT ON TABLE jobs IS 'Roofing jobs/projects from lead to completion';
COMMENT ON TABLE invoices IS 'Customer invoices for completed jobs';
COMMENT ON TABLE sequences IS 'Automated follow-up sequence definitions';
COMMENT ON TABLE sequence_enrollments IS 'Customers enrolled in follow-up sequences';
COMMENT ON TABLE communications IS 'Log of all inbound/outbound communications';
COMMENT ON TABLE reviews IS 'Customer reviews across platforms';
COMMENT ON TABLE job_documents IS 'Photos and documents attached to jobs';
COMMENT ON TABLE workspace_knowledge IS 'Knowledge base with vector embeddings for AI';
COMMENT ON TABLE phone_numbers IS 'Twilio phone numbers for each workspace';
COMMENT ON TABLE background_jobs IS 'Scheduled background job tracking';
COMMENT ON TABLE pricing_rules IS 'Material and labor pricing rules for estimates';
