import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://bmsnbwgwdxqhccqesgkt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc25id2d3ZHhxaGNjcWVzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTExNjksImV4cCI6MjA4OTA4NzE2OX0.IhByvcKXFOL6XwW3UhTig6XMzNrNvpYFhaehq2_DUBU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Sign in to get a session (needed for RLS)
async function check() {
  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'kaviyashree010506@gmail.com',
    password: 'kaviya123' // placeholder — may need changing
  })
  
  if (signInErr) {
    fs.writeFileSync('debug_out.txt', 'SignIn Error: ' + signInErr.message)
    return
  }

  const { data: accs } = await supabase.from('accounts').select('id, account_name, b2c_stage_id').limit(5)
  const { data: cs, error: csErr } = await supabase.from('customer_services').select('id, account_id, service_id, services(service_name)').limit(10)

  fs.writeFileSync('debug_out.txt', JSON.stringify({
    user: signIn.user?.email,
    accounts: accs,
    customerServices: cs,
    csError: csErr
  }, null, 2))
}

check()
