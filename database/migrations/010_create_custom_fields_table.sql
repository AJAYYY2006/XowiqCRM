-- Create Field Type Enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_type_enum') THEN
        CREATE TYPE field_type_enum AS ENUM (
            'text', 'number', 'dropdown', 'multi_select', 'date', 
            'checkbox', 'file_upload', 'url', 'long_text'
        );
    END IF;
END $$;

-- Create Custom Field Configs Table
CREATE TABLE IF NOT EXISTS public.custom_field_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module TEXT NOT NULL DEFAULT 'customer_profile',
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type field_type_enum NOT NULL DEFAULT 'text',
    options TEXT[] DEFAULT NULL,
    is_required BOOLEAN DEFAULT false,
    is_core BOOLEAN DEFAULT false,
    show_in_list BOOLEAN DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_field_per_module UNIQUE(business_id, module, field_key)
);

-- Add RLS
ALTER TABLE public.custom_field_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Businesses can manage their own field configs" ON public.custom_field_configs;

CREATE POLICY "Businesses can manage their own field configs"
ON public.custom_field_configs
FOR ALL
USING (auth.uid() = business_id);

-- Migration: Add module column if table existed but column was missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_configs' AND column_name='module') THEN
        ALTER TABLE public.custom_field_configs ADD COLUMN module TEXT NOT NULL DEFAULT 'customer_profile';
        
        -- Drop old constraint and add new one
        ALTER TABLE public.custom_field_configs DROP CONSTRAINT IF EXISTS custom_field_configs_business_id_field_key_key;
        ALTER TABLE public.custom_field_configs ADD CONSTRAINT unique_field_per_module UNIQUE(business_id, module, field_key);
    END IF;
END $$;

-- Seed Core Fields for existing users (Customer Profiles & Leads)
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        -- Seed Customer Profile Core Fields
        INSERT INTO public.custom_field_configs (business_id, module, field_key, label, field_type, is_required, is_core, display_order)
        VALUES 
            (user_record.id, 'customer_profile', 'customer_name', 'Customer Name', 'text', true, true, 0),
            (user_record.id, 'customer_profile', 'contact_number', 'Contact Number', 'text', true, true, 1),
            (user_record.id, 'customer_profile', 'email_id', 'Email ID', 'text', false, true, 2),
            (user_record.id, 'customer_profile', 'gender', 'Gender', 'dropdown', false, true, 3),
            (user_record.id, 'customer_profile', 'notes', 'Notes', 'long_text', false, true, 4)
        ON CONFLICT (business_id, module, field_key) DO NOTHING;

        -- Seed Leads Core Fields
        INSERT INTO public.custom_field_configs (business_id, module, field_key, label, field_type, is_required, is_core, display_order)
        VALUES 
            (user_record.id, 'lead', 'lead_name', 'Lead Name', 'text', true, true, 0),
            (user_record.id, 'lead', 'contact_number', 'Contact Number', 'text', true, true, 1),
            (user_record.id, 'lead', 'email', 'Email Address', 'text', false, true, 2),
            (user_record.id, 'lead', 'company', 'Company Name', 'text', false, true, 3)
        ON CONFLICT (business_id, module, field_key) DO NOTHING;
    END LOOP;
END $$;

-- Ensure both accounts and leads tables have custom_data column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='custom_data') THEN
        ALTER TABLE public.accounts ADD COLUMN custom_data JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='custom_data') THEN
        ALTER TABLE public.leads ADD COLUMN custom_data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
