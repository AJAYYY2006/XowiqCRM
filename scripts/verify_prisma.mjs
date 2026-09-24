// ==============================================================================
// XOWIQ CRM — Prisma Verification Script
// Tests Prisma Client connection and verifies counts across all tables
// ==============================================================================

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function main() {
  console.log('🚀 Connecting to Supabase Database via Prisma Client...\n')

  try {
    const [
      accountCount,
      contactCount,
      leadCount,
      oppCount,
      quoteCount,
      invoiceCount,
      serviceCount,
      taskCount,
      ticketCount,
      profileCount,
      customFieldCount,
      tagCount,
      teamMemberCount,
      notificationCount
    ] = await Promise.all([
      prisma.account.count(),
      prisma.contact.count(),
      prisma.lead.count(),
      prisma.opportunity.count(),
      prisma.quote.count(),
      prisma.invoice.count(),
      prisma.service.count(),
      prisma.task.count(),
      prisma.ticket.count(),
      prisma.profile.count(),
      prisma.customFieldConfig.count(),
      prisma.tag.count(),
      prisma.teamMember.count(),
      prisma.notification.count()
    ])

    console.log('✅ Connection Successful! Live Database Counts:')
    console.table([
      { Table: 'accounts', 'Record Count': accountCount },
      { Table: 'contacts', 'Record Count': contactCount },
      { Table: 'leads', 'Record Count': leadCount },
      { Table: 'opportunities', 'Record Count': oppCount },
      { Table: 'quotes', 'Record Count': quoteCount },
      { Table: 'invoices', 'Record Count': invoiceCount },
      { Table: 'services', 'Record Count': serviceCount },
      { Table: 'tasks', 'Record Count': taskCount },
      { Table: 'tickets', 'Record Count': ticketCount },
      { Table: 'profiles', 'Record Count': profileCount },
      { Table: 'custom_field_configs', 'Record Count': customFieldCount },
      { Table: 'tags', 'Record Count': tagCount },
      { Table: 'team_members', 'Record Count': teamMemberCount },
      { Table: 'notifications', 'Record Count': notificationCount }
    ])

    console.log('\n🎉 All Prisma models queried successfully!')
  } catch (error) {
    console.error('❌ Prisma query error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
