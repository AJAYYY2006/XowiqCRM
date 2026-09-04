import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const { Client } = pg

function readSqlFile(filePath) {
  const buf = fs.readFileSync(filePath)
  let content
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    content = buf.toString('utf16le')
  } else if (buf.indexOf(0x00) !== -1) {
    content = buf.toString('utf16le')
  } else {
    content = buf.toString('utf8')
  }
  // Strip BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1)
  }
  return content
}

async function runMigrations() {
  console.log('🚀 Starting Supabase Database Migration Runner...')

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'db.bmsnbwgwdxqhccqesgkt.supabase.co',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hVL7N1zWiFKnh7Ey',
    ssl: { rejectUnauthorized: false }
  }

  console.log(`🔌 Connecting to database...`)
  
  const client = new Client(
    typeof connectionString === 'string'
      ? { connectionString, ssl: { rejectUnauthorized: false } }
      : connectionString
  )

  try {
    await client.connect()
    console.log('✅ Connected to Postgres database successfully!')

    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Get list of already applied migrations
    const res = await client.query(`SELECT name FROM _migrations ORDER BY id ASC;`)
    const appliedMigrations = new Set(res.rows.map(r => r.name))

    const migrationsDir = path.resolve(__dirname, '../database/migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`\n📋 Found ${files.length} migration files in database/migrations/\n`)

    let appliedCount = 0
    let skippedCount = 0

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        console.log(`⏩ [SKIPPED] ${file} (already applied)`)
        skippedCount++
        continue
      }

      console.log(`⏳ [APPLYING] ${file}...`)
      const filePath = path.join(migrationsDir, file)
      const sql = readSqlFile(filePath)

      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`✅ [APPLIED]  ${file}`)
        appliedCount++
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`❌ [FAILED]   ${file}`)
        console.error(`Error details: ${err.message}`)
        console.error(`Statement error code: ${err.code}`)
        throw err
      }
    }

    console.log(`\n🎉 Migration Summary:`)
    console.log(`   - Total migrations: ${files.length}`)
    console.log(`   - Newly applied:    ${appliedCount}`)
    console.log(`   - Already applied:  ${skippedCount}`)
    console.log(`   - Status:           All migrations completed successfully!\n`)

  } catch (err) {
    console.error(`\n❌ Migration failed:`, err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigrations()
