require('dotenv').config({ path: 'apps/api/.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const email = 'driver@waypoint.local';
  const password = process.env.NEW_DRIVER_PASSWORD;
  if (!password) throw new Error('Set NEW_DRIVER_PASSWORD before running this script.');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Driver account already exists; its password was not changed.');
  await prisma.user.create({ data: { email, name: 'Demo Driver', role: 'DRIVER', passwordHash: await bcrypt.hash(password, 10) } });
  console.log('Created driver account:', email);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
