import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const { Client } = pg

async function inspectSchema() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()
  console.log('🔌 Connected to Supabase DB for schema inspection\n')

  // 1. Get all public tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `)

  console.log(`📋 Total Public Tables: ${tablesRes.rows.length}`)

  for (const row of tablesRes.rows) {
    const tableName = row.table_name
    console.log(`\n========================================`)
    console.log(`📦 Table: ${tableName}`)
    console.log(`========================================`)

    // Columns
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName])

    console.log('Columns:')
    colRes.rows.forEach(c => {
      console.log(`  - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${c.column_default ? 'DEFAULT ' + c.column_default : ''}`)
    })

    // Indexes
    const idxRes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = $1;
    `, [tableName])

    console.log('Indexes:')
    idxRes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`)
    })

    // RLS Status
    const rlsRes = await client.query(`
      SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = $1;
    `, [tableName])
    console.log(`RLS Enabled: ${rlsRes.rows[0]?.rowsecurity ? 'YES' : 'NO'}`)
  }

  await client.end()
}

inspectSchema().catch(console.error)
