# =========================
# Builder Stage
# =========================
FROM node:20-alpine AS builder

# Prisma requires OpenSSL
RUN apk add --no-cache openssl

WORKDIR /app

# Copy workspace package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Install all dependencies required for build
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package
RUN npm run build --workspace=@waypoint/shared

# Generate Prisma client and build API
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build


# =========================
# Runtime Stage
# =========================
FROM node:20-alpine AS runner

# Prisma runtime dependency
RUN apk add --no-cache openssl

WORKDIR /app

# Copy workspace package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# We need Prisma CLI + tsx at runtime for migrate + seed
RUN npm ci --include=dev

ENV NODE_ENV=production

# Copy compiled application
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy Prisma schema, migrations and seed files
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && npm run db:seed --workspace=@waypoint/api && node apps/api/dist/server.js"]