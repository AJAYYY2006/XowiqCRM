-- ==============================================================================
-- 016_enterprise_scale_architecture.sql
-- XOWIQ CRM — Complete Enterprise-Scale Database Architecture & Scaling Extensions
-- ==============================================================================

-- Enable essential Postgres extensions for enterprise scaling & search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==============================================================================
-- 1. Automated Timestamp Trigger Function
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. Ensure Core Tables Have Standard Enterprise Columns
-- ==============================================================================

-- Accounts
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'B2B',
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Website',
  ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Opportunities (Deals)
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS expected_revenue NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 18,
  ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Customer Services
ALTER TABLE public.customer_services
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS assigned_to UUID;

-- Tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS resolution TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- Profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS time_zone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS revenue_goal NUMERIC DEFAULT 10000;

-- ==============================================================================
-- 3. Future-Scale Architectural Tables
-- ==============================================================================

-- A. In-App Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'deal', 'task', 'ticket'
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B. Audit Logs Table (Compliance, Security & History)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL, -- 'leads', 'accounts', 'opportunities', 'invoices', etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
  changes JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- C. Documents & Attachments Table
CREATE TABLE IF NOT EXISTS public.documents_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'account', 'lead', 'opportunity', 'ticket', 'invoice'
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- D. Team Members & Roles Hierarchy
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'admin', 'manager', 'sales_rep', 'support_agent', 'viewer'
  department TEXT DEFAULT 'Sales',
  permissions JSONB DEFAULT '{"leads": true, "deals": true, "invoices": true, "reports": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (admin_id, member_user_id)
);

-- E. Tags & Labels System
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  entity_type TEXT NOT NULL, -- 'leads', 'accounts', 'deals', 'tickets'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, name, entity_type)
);

CREATE TABLE IF NOT EXISTS public.entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tag_id, entity_id)
);

-- F. Webhook Integrations Table
CREATE TABLE IF NOT EXISTS public.webhook_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  events TEXT[] DEFAULT ARRAY['lead.created', 'opportunity.won', 'invoice.paid'],
  secret_key TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 4. High-Performance Indexing Strategy (B-Tree + GIN)
-- ==============================================================================

-- Multi-Tenant Composite Indexes for Instant Pagination & Filtering
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON public.leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_custom_data ON public.leads USING GIN (custom_data);

CREATE INDEX IF NOT EXISTS idx_accounts_user_created ON public.accounts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_b2c_stage ON public.accounts(b2c_stage_id);
CREATE INDEX IF NOT EXISTS idx_accounts_custom_data ON public.accounts USING GIN (custom_data);

CREATE INDEX IF NOT EXISTS idx_contacts_user_acc ON public.contacts(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead ON public.contacts(lead_id);

CREATE INDEX IF NOT EXISTS idx_opps_user_stage ON public.opportunities(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_opps_account ON public.opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_opps_created ON public.opportunities(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotes_user_status ON public.quotes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_account ON public.quotes(account_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON public.invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due ON public.tasks(user_id, status, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_tasks_custom_data ON public.tasks USING GIN (custom_data);

CREATE INDEX IF NOT EXISTS idx_tickets_user_status_prio ON public.tickets(user_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_tickets_custom_data ON public.tickets USING GIN (custom_data);

CREATE INDEX IF NOT EXISTS idx_activities_user_created ON public.activities(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_docs_entity ON public.documents_attachments(entity_type, entity_id);

-- Trigram / Text Search Indexes for Ultra-Fast Global Search
CREATE INDEX IF NOT EXISTS idx_leads_search ON public.leads USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_accounts_search ON public.accounts USING gin (account_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_search ON public.contacts USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_opps_search ON public.opportunities USING gin (name gin_trgm_ops);

-- ==============================================================================
-- 5. Attach Auto-Timestamp Update Triggers
-- ==============================================================================
DO $$ 
DECLARE 
  t TEXT;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'accounts', 'leads', 'contacts', 'opportunities', 'quotes', 
      'invoices', 'services', 'customer_services', 'tasks', 'tickets', 
      'profiles', 'reports', 'team_members', 'webhook_integrations'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_update_timestamp_%1$s ON public.%1$s;
      CREATE TRIGGER trg_update_timestamp_%1$s
        BEFORE UPDATE ON public.%1$s
        FOR EACH ROW
        EXECUTE FUNCTION public.set_current_timestamp_updated_at();
    ', t);
  END LOOP;
END $$;

-- ==============================================================================
-- 6. Row Level Security (RLS) Setup on All New Tables
-- ==============================================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their notifications" ON public.notifications;
CREATE POLICY "Users can manage their notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view relevant audit logs" ON public.audit_logs;
CREATE POLICY "Users can view relevant audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.documents_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their attachments" ON public.documents_attachments;
CREATE POLICY "Users can manage their attachments" ON public.documents_attachments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins and members can view team structure" ON public.team_members;
CREATE POLICY "Admins and members can view team structure" ON public.team_members
  FOR SELECT USING (auth.uid() = admin_id OR auth.uid() = member_user_id);
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
CREATE POLICY "Admins can manage team members" ON public.team_members
  FOR ALL USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their tags" ON public.tags;
CREATE POLICY "Users can manage their tags" ON public.tags
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage entity tags" ON public.entity_tags;
CREATE POLICY "Authenticated users can manage entity tags" ON public.entity_tags
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.webhook_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their webhooks" ON public.webhook_integrations;
CREATE POLICY "Users can manage their webhooks" ON public.webhook_integrations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ensure service_role and authenticated roles have grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
