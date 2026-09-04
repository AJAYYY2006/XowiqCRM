import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://bmsnbwgwdxqhccqesgkt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc25id2d3ZHhxaGNjcWVzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTExNjksImV4cCI6MjA4OTA4NzE2OX0.IhByvcKXFOL6XwW3UhTig6XMzNrNvpYFhaehq2_DUBU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data: stages, error: stagesError } = await supabase.from('b2c_stages').select('*')
  const { data: accounts, error: accountsError } = await supabase.from('accounts').select('id, account_name, b2c_stage_id').limit(10)

  fs.writeFileSync('debug_out.txt', JSON.stringify({
    stages,
    stagesError,
    accounts,
    accountsError
  }, null, 2))
}

run()
