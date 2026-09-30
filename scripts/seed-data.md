# Database Seeding Guide

## Baseline Accounts

The seed script (`apps/api/prisma/seed.ts`) seeds four baseline role accounts required for end-to-end testing:

| Role | Email | Required Env Variable | Description |
| :--- | :--- | :--- | :--- |
| **STORE_MANAGER** | `storemanager@waypoint.local` | `SEED_STORE_MANAGER_PASSWORD` | Store Manager test account |
| **DISPATCHER** | `dispatcher@waypoint.local` | `SEED_DISPATCHER_PASSWORD` | Dispatcher test account |
| **LOADER** | `loader@waypoint.local` | `SEED_LOADER_PASSWORD` | Warehouse Loader test account |
| **DRIVER** | `driver@waypoint.local` | `SEED_DRIVER_PASSWORD` | Driver test account |

## Strict Environment Configuration Requirement

All four password environment variables **must be explicitly defined** in your `.env` file or execution environment before running the seed script.

The seed script enforces strict validation:
- No hardcoded or fallback default passwords exist in the codebase.
- If any required seed password variable is missing or blank, the seed script aborts immediately with exit code 1 and prints the missing variable names.
- Password values are never printed to terminal logs.

## Running the Seed Command

Ensure your PostgreSQL database is running and Prisma schema is applied:

```bash
# Push schema changes to database
npm run db:push

# Execute seed script
npm run db:seed
```

## Security Note

Configure unique, strong passwords via your private `.env` file before executing the seed runner. Never commit `.env` files or actual credentials into version control.
