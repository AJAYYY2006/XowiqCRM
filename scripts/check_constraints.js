import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const { Client } = pg

async function run() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })
  await client.connect()

  const res = await client.query(`
    SELECT conrelid::regclass as table_name, conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' AND contype = 'c';
  `)

  console.log('Check Constraints in Public Schema:')
  res.rows.forEach(r => {
    console.log(`- Table: ${r.table_name}, Constraint: ${r.conname} => ${r.pg_get_constraintdef}`)
  })

  await client.end()
}

run().catch(console.error)
