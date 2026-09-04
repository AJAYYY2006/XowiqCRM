import { createClient } from '@supabase/supabase-js'
import { config } from './env.js'

if (!config.supabaseUrl || !config.supabaseServiceKey) {
  console.warn('⚠️ Server Supabase credentials missing. Check .env configuration.')
}

export const supabaseServer = createClient(
  config.supabaseUrl || 'https://placeholder.supabase.co',
  config.supabaseServiceKey || 'placeholder-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
