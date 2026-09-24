import 'dotenv/config';
import fs from 'fs';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  const sql = fs.readFileSync('./database/migrations/021_add_profiles_rls_policies.sql', 'utf8');
  const cleanedSql = sql
    .replace(/--.*$/gm, '') // remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // remove block comments

  const statements = cleanedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    console.log('Executing:', stmt.slice(0, 50) + '...');
    await prisma.$executeRawUnsafe(stmt);
  }

  const policies = await prisma.$queryRawUnsafe(`
    SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';
  `);
  console.log('Policies on profiles:', policies);
}

main().catch(console.error).finally(() => prisma.$disconnect());
