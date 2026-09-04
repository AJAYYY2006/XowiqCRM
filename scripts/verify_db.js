import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const { Client } = pg

async function verify() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()
  console.log('✅ Connected to database for verification.')

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `)

  console.log('\n📊 Public Tables:')
  tablesRes.rows.forEach(r => console.log(` - ${r.table_name}`))

  const migRes = await client.query(`SELECT name, applied_at FROM _migrations ORDER BY id;`)
  console.log('\n📋 Applied Migrations:')
  migRes.rows.forEach(r => console.log(` ✅ ${r.name} (${r.applied_at.toISOString()})`))

  await client.end()
}

verify().catch(console.error)
