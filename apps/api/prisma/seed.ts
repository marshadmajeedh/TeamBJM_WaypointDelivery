import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 10;

interface SeedUserConfig {
  email: string;
  name: string;
  role: UserRole;
  envPasswordKey: string;
}

const SEED_USERS: SeedUserConfig[] = [
  {
    email: 'storemanager@waypoint.local',
    name: 'Store Manager User',
    role: UserRole.STORE_MANAGER,
    envPasswordKey: 'SEED_STORE_MANAGER_PASSWORD',
  },
  {
    email: 'dispatcher@waypoint.local',
    name: 'Chief Dispatcher User',
    role: UserRole.DISPATCHER,
    envPasswordKey: 'SEED_DISPATCHER_PASSWORD',
  },
  {
    email: 'loader@waypoint.local',
    name: 'Warehouse Loader User',
    role: UserRole.LOADER,
    envPasswordKey: 'SEED_LOADER_PASSWORD',
  },
  {
    email: 'driver@waypoint.local',
    name: 'Lead Driver User',
    role: UserRole.DRIVER,
    envPasswordKey: 'SEED_DRIVER_PASSWORD',
  },
];

async function main() {
  console.log('--- Waypoint Delivery System Seed Initialization ---');

  // Verify all required environment variables are present before proceeding
  const missingEnvKeys: string[] = [];
  for (const userConfig of SEED_USERS) {
    const val = process.env[userConfig.envPasswordKey];
    if (!val || val.trim() === '') {
      missingEnvKeys.push(userConfig.envPasswordKey);
    }
  }

  if (missingEnvKeys.length > 0) {
    console.error(
      `[FATAL] Seed aborted: Missing required environment variable(s):\n` +
      missingEnvKeys.map((k) => `  - ${k}`).join('\n') +
      `\nPlease define these variables in your environment or .env file before seeding.`
    );
    process.exit(1);
  }

  console.log('Seeding initial foundation user accounts with configured environment passwords...');

  for (const userConfig of SEED_USERS) {
    const rawPassword = process.env[userConfig.envPasswordKey]!;
    const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: userConfig.email },
      update: {
        name: userConfig.name,
        role: userConfig.role,
        passwordHash,
      },
      create: {
        email: userConfig.email,
        name: userConfig.name,
        role: userConfig.role,
        passwordHash,
      },
    });

    console.log(`[OK] Seeded account: ${user.email} (${user.role}) - ID: ${user.id}`);
  }

  console.log('Seed initialization complete. Baseline accounts are ready.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
