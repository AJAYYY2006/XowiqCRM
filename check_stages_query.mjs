import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://bmsnbwgwdxqhccqesgkt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc25id2d3ZHhxaGNjcWVzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTExNjksImV4cCI6MjA4OTA4NzE2OX0.IhByvcKXFOL6XwW3UhTig6XMzNrNvpYFhaehq2_DUBU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  // Let's first insert or find an account ID
  const { data: accounts } = await supabase.from('accounts').select('id').limit(1)
  if (accounts && accounts.length > 0) {
    const accId = accounts[0].id
    console.log("Testing with account ID:", accId, "type:", typeof accId)
    
    // Now query b2c_customer_stages
    const { data: stages, error } = await supabase.from('b2c_customer_stages').select('*').eq('customer_id', accId)
    fs.writeFileSync('debug_out.txt', JSON.stringify({
      accId,
      stages,
      error
    }, null, 2))
  } else {
    fs.writeFileSync('debug_out.txt', 'No accounts found to test')
  }
}

run()
