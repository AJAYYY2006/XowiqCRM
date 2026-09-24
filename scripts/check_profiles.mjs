import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  const profiles = await prisma.profile.findMany({
    select: { id: true, name: true, email: true, role: true, currency: true, createdByAdminId: true }
  });
  console.log('All profiles:', JSON.stringify(profiles, null, 2));

  const rls = await prisma.$queryRawUnsafe(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public';
  `);
  console.log('All public RLS policies count:', rls.length);
  console.log('Tables with policies:', [...new Set(rls.map(p => p.tablename))]);
}

main().catch(console.error).finally(() => prisma.$disconnect());
