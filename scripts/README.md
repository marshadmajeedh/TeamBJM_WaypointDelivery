# Utility Scripts & Operational Tools

This directory contains utility scripts and operational guides for the Waypoint Delivery Planning System.

## Available Workflows

- **Database Seed Runner**: See [seed-data.md](file:///scripts/seed-data.md) for full instructions on seeding baseline user accounts and operational entities.
- **Prisma Migrations**: Managed via `npm run db:migrate` and `npm run db:push`.
- **Database Client Generation**: Managed via `npm run db:generate`.

## Safety Policy

- Scripts must **never** silently purge or drop production database volumes.
- Passwords and confidential credentials must be passed via environment variables, never hardcoded in scripts.
