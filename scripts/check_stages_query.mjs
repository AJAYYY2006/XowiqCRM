import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bmsnbwgwdxqhccqesgkt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc25id2d3ZHhxaGNjcWVzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTExNjksImV4cCI6MjA4OTA4NzE2OX0.IhByvcKXFOL6XwW3UhTig6XMzNrNvpYFhaehq2_DUBU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const STAGE_CANDIDATES = [
  'Prospecting', 'Scoping', 'Negotiation', 'Legal', 'Contract', 'Closed',
  'Qualification', 'Needs Analysis', 'Value Proposition', 'Id. Decision Makers',
  'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost',
  'New', 'Contacted', 'Nurturing', 'Converted', 'Archived',
  'Lead', 'Opportunity', 'Quote', 'Invoice', 'Payment',
  'Open', 'Pending', 'In Progress', 'Completed', 'Overdue',
  'Prospect', 'Proposal', 'Closed Won', 'Closed Lost'
]

async function run() {
  // Let's get the user ID first
  const { data: users } = await supabase.from('profiles').select('id').limit(1)
  if (!users || users.length === 0) {
    console.log('No profiles found in public.profiles')
    return
  }
  const userId = users[0].id
  console.log('Using userId:', userId)

  // Insert dummy account
  const { data: accData, error: accError } = await supabase.from('accounts').insert([{
    account_name: 'Temp Test Account',
    user_id: userId
  }]).select()

  if (accError) {
    console.error('Failed to create test account:', accError)
    return
  }
  const accountId = accData[0].id

  for (const stage of STAGE_CANDIDATES) {
    const { data, error } = await supabase.from('opportunities').insert([{
      name: 'Test Opp ' + stage,
      account_id: accountId,
      amount: 100,
      stage: stage,
      owner: 'Test Owner',
      user_id: userId
    }]).select()
    
    if (error) {
      if (error.message.includes('violates check constraint')) {
        // Violates constraint
      } else {
        console.log(`Stage '${stage}' failed with other error:`, error.message)
      }
    } else {
      console.log(`>>> Stage '${stage}' SUCCESS! <<<`)
      // Delete the test record
      await supabase.from('opportunities').delete().eq('id', data[0].id)
    }
  }

  // Delete dummy account
  await supabase.from('accounts').delete().eq('id', accountId)
}

run()
