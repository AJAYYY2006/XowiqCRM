import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const { Client } = pg

export const DEV_USERS = [
  {
    name: 'Alex Rivera (Super Admin)',
    email: 'admin@xowiq.com',
    password: 'Password@123',
    role: 'admin',
    companyName: 'XOWIQ Global HQ',
    companyType: 'B2B',
    phone: '+1 (555) 019-2834',
    badge: 'Super Admin',
    icon: '👑',
    color: '#6366f1',
    desc: 'Full administrative access across all CRM modules, user management, and security.'
  },
  {
    name: 'Sarah Connor (Sales Manager)',
    email: 'sales@xowiq.com',
    password: 'Password@123',
    role: 'manager',
    companyName: 'XOWIQ Enterprise Sales',
    companyType: 'B2B',
    phone: '+1 (555) 014-9921',
    badge: 'Sales Lead',
    icon: '💼',
    color: '#ff5900',
    desc: 'Pipeline deals, quotes, lead conversion, customer accounts, and revenue forecasting.'
  },
  {
    name: 'Marcus Vance (Support Lead)',
    email: 'support@xowiq.com',
    password: 'Password@123',
    role: 'agent',
    companyName: 'XOWIQ Customer Care',
    companyType: 'B2B',
    phone: '+1 (555) 018-7744',
    badge: 'Support Agent',
    icon: '🎧',
    color: '#06b6d4',
    desc: 'Customer ticketing, service subscriptions, SLA resolution, and priority tasks.'
  },
  {
    name: 'Elena Rostova (B2C Retail Owner)',
    email: 'b2c.demo@xowiq.com',
    password: 'Password@123',
    role: 'admin',
    companyName: 'Rostova Lifestyle & Spa',
    companyType: 'B2C',
    phone: '+1 (555) 012-3456',
    badge: 'B2C Business',
    icon: '🛍️',
    color: '#ec4899',
    desc: 'B2C customer lifecycle, stage tracking pipelines, instant service billing.'
  },
  {
    name: 'David Chen (Team Member)',
    email: 'viewer@xowiq.com',
    password: 'Password@123',
    role: 'user',
    companyName: 'XOWIQ Operations',
    companyType: 'B2B',
    phone: '+1 (555) 017-8899',
    badge: 'Staff / Viewer',
    icon: '👁️',
    color: '#10b981',
    desc: 'Standard team member view for logging tasks, viewing contacts and deals.'
  }
]

async function seedUsers() {
  console.log('🌱 Starting Dev & Demo Accounts Seeding...\n')

  const dbClient = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })
  await dbClient.connect()

  // Get existing users
  const { data: existingUserList } = await supabaseAdmin.auth.admin.listUsers()

  for (const user of DEV_USERS) {
    console.log(`👤 Processing account: ${user.email} (${user.badge})...`)

    let existing = existingUserList?.users?.find(u => u.email.toLowerCase() === user.email.toLowerCase())
    let userId

    if (existing) {
      userId = existing.id
      console.log(`   ℹ️ User already exists (ID: ${userId}). Updating credentials...`)
      
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
          companyName: user.companyName,
          companyType: user.companyType
        }
      })
      if (updateErr) console.warn(`   ⚠️ Update user auth warning:`, updateErr.message)
    } else {
      console.log(`   ✨ Creating new auth account for ${user.email}...`)
      const { data: newAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
          companyName: user.companyName,
          companyType: user.companyType
        }
      })

      if (createErr) {
        console.error(`   ❌ Failed to create auth user:`, createErr.message)
        continue
      }
      userId = newAuth.user.id
    }

    // Ensure Profile Record in public.profiles
    await dbClient.query(`
      INSERT INTO public.profiles (
        id, name, email, role, company_name, company_type, phone, currency, business_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, '$', $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        company_name = EXCLUDED.company_name,
        company_type = EXCLUDED.company_type,
        phone = EXCLUDED.phone;
    `, [userId, user.name, user.email, user.role, user.companyName, user.companyType, user.phone])

    console.log(`   ✅ Profile synced: ${user.name}`)

    // Seed Starter Demo Records for this user
    try {
      await seedDemoDataForUser(dbClient, userId, user)
      console.log(`   ✅ Demo data populated.`)
    } catch (dErr) {
      console.warn(`   ⚠️ Demo data notice:`, dErr.message)
    }
  }

  await dbClient.end()
  console.log('\n🎉 All Dev & Demo Accounts successfully seeded with sample data!')
}

async function seedDemoDataForUser(client, userId, user) {
  // A. Seed Sample Accounts
  const accRes = await client.query(`
    INSERT INTO public.accounts (user_id, account_name, email, phone, industry, account_type)
    VALUES 
      ($1, 'Apex Tech Solutions', 'contact@apextech.io', '+1 (555) 234-5678', 'Technology', $2),
      ($1, 'Global Media Group', 'info@globalmedia.com', '+1 (555) 876-5432', 'Media & Advertising', $2),
      ($1, 'Zenith Healthcare', 'admin@zenithhealth.org', '+1 (555) 345-6789', 'Healthcare', $2)
    ON CONFLICT DO NOTHING
    RETURNING id, account_name;
  `, [userId, user.companyType])

  const accountId = accRes.rows[0]?.id

  // B. Seed Sample Leads (using allowed status: 'new', 'contacted', 'converted')
  await client.query(`
    INSERT INTO public.leads (user_id, name, company, email, contact_number, status, source, score)
    VALUES 
      ($1, 'Jordan Peterson', 'Quantum Dynamics', 'jordan@quantumdyn.com', '+1 555-0199', 'new', 'Website', 85),
      ($1, 'Sophia Williams', 'Starlight Retail', 'sophia@starlight.co', '+1 555-0188', 'contacted', 'LinkedIn', 70),
      ($1, 'Liam Vance', 'BlueHorizon Capital', 'liam@bluehorizon.io', '+1 555-0177', 'converted', 'Referral', 92)
    ON CONFLICT DO NOTHING;
  `, [userId])

  // C. Seed Sample Opportunities (Deals)
  if (accountId) {
    await client.query(`
      INSERT INTO public.opportunities (user_id, name, account_id, stage, amount, probability, expected_revenue)
      VALUES 
        ($1, 'Enterprise Cloud Migration', $2, 'prospecting', 45000, 75, 33750),
        ($1, 'Annual Software Subscription', $2, 'closed_won', 18500, 90, 16650)
      ON CONFLICT DO NOTHING;
    `, [userId, accountId])

    // D. Seed Sample Quotes
    await client.query(`
      INSERT INTO public.quotes (user_id, quote_name, account_id, total_price, status, invoice_number)
      VALUES 
        ($1, 'Quote #1042 - Cloud License', $2, 45000, 'Approved', 'INV-2026-001'),
        ($1, 'Quote #1043 - Support SLA', $2, 18500, 'Sent', 'INV-2026-002')
      ON CONFLICT DO NOTHING;
    `, [userId, accountId])

    // E. Seed Sample Invoices
    await client.query(`
      INSERT INTO public.invoices (user_id, invoice_name, account_id, amount, status, due_date)
      VALUES 
        ($1, 'Invoice #INV-2026-001', $2, 45000, 'paid', NOW() + INTERVAL '15 days'),
        ($1, 'Invoice #INV-2026-002', $2, 18500, 'sent', NOW() + INTERVAL '30 days')
      ON CONFLICT DO NOTHING;
    `, [userId, accountId])
  }

  // F. Seed Sample Tasks
  await client.query(`
    INSERT INTO public.tasks (user_id, title, due_date, status, priority, task_type)
    VALUES 
      ($1, 'Follow up with Jordan on Enterprise Contract', NOW() + INTERVAL '2 days', 'Open', 'High', 'Call'),
      ($1, 'Review Quarterly Performance Metrics', NOW() + INTERVAL '5 days', 'Open', 'Medium', 'Meeting'),
      ($1, 'Send Onboarding Documentation to New Clients', NOW() + INTERVAL '1 day', 'Pending', 'Urgent', 'Email')
    ON CONFLICT DO NOTHING;
  `, [userId])

  // G. Seed Sample Tickets
  await client.query(`
    INSERT INTO public.tickets (user_id, subject, description, priority, status)
    VALUES 
      ($1, 'SSO Configuration Assistance', 'Client needs assistance setting up SAML 2.0 SSO credentials.', 'high', 'open'),
      ($1, 'Billing Currency Question', 'Requesting invoice regeneration with EUR currency support.', 'medium', 'pending')
    ON CONFLICT DO NOTHING;
  `, [userId])

  // H. Seed Sample Notifications
  await client.query(`
    INSERT INTO public.notifications (user_id, title, message, type, is_read)
    VALUES 
      ($1, 'Welcome to XOWIQ CRM', 'Your workspace is fully configured and ready for production.', 'success', false),
      ($1, 'New Deal Assigned', 'You have been assigned to Enterprise Cloud Migration deal.', 'deal', false),
      ($1, 'Upcoming Task Reminder', 'Follow up with Jordan on Enterprise Contract is due soon.', 'task', false)
    ON CONFLICT DO NOTHING;
  `, [userId])
}

seedUsers().catch(console.error)
