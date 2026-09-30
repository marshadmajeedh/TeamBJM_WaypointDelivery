FROM node:20-alpine AS builder

WORKDIR /app

# Copy root monorepo package manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/

RUN npm ci

# Copy sources
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package then web app
RUN npm run build --workspace=@waypoint/shared
WORKDIR /app/apps/web
RUN npm run build

# Production static serving with Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Optional custom nginx configuration for SPA routing fallback
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
