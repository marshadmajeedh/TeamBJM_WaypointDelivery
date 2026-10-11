import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(
      'Store setup missing: ' +
        missing.join(', ') +
        '. Configure apps/api/.env locally; do not share secrets in chat.'
    );
    process.exitCode = 1;
    return;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    const managers = await prisma.user.findMany({
      where: { role: 'STORE_MANAGER' },
      select: { depotId: true },
    });
    const depots = [
      ...new Set(managers.flatMap((manager) => (manager.depotId ? [manager.depotId] : []))),
    ];
    const outlets = await prisma.outlet.count({ where: { depotId: { in: depots } } });
    const sync = await prisma.syncRecord.count({ where: { entityType: 'STORE_MANAGER_DRAFT' } });
    console.log(
      JSON.stringify(
        {
          databaseConnected: true,
          storeManagers: managers.length,
          managersWithDepot: managers.filter((manager) => manager.depotId).length,
          accessibleOutlets: outlets,
          savedDrafts: sync,
        },
        null,
        2
      )
    );
    if (!managers.length || !depots.length || !outlets) {
      console.error(
        'A Store Manager account, depot assignment, and matching outlet are required. Existing data was not changed.'
      );
      process.exitCode = 1;
    }
  } catch {
    console.error(
      'Database check failed. Verify the existing Supabase connection and foundation migrations locally. No credentials were printed.'
    );
    process.exitCode = 1;
  }
}
void main().finally(() => prisma.$disconnect());
