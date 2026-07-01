import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://bmsnbwgwdxqhccqesgkt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc25id2d3ZHhxaGNjcWVzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTExNjksImV4cCI6MjA4OTA4NzE2OX0.IhByvcKXFOL6XwW3UhTig6XMzNrNvpYFhaehq2_DUBU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'kaviyashree010506@gmail.com',
    password: 'kaviya123'
  })
  
  if (signInErr) {
    fs.writeFileSync('debug_out.txt', 'SignIn Error: ' + signInErr.message)
    return
  }

  // Pick an account
  const { data: accs } = await supabase.from('accounts').select('id').limit(1)
  const id = accs[0]?.id

  if (!id) return;

  const { data: cs, error: csErr } = await supabase.from('customer_services').select('*').eq('account_id', id).order('assigned_date', { ascending: false })

  fs.writeFileSync('debug_out.txt', JSON.stringify({
    accountId: id,
    customerServices: cs,
    csError: csErr
  }, null, 2))
}

check()
