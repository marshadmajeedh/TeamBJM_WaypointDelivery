FROM node:20-alpine AS builder

WORKDIR /app

# Build-time environment variable for the frontend API
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy root monorepo package manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy sources
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package
RUN npm run build --workspace=@waypoint/shared

# Build web app
WORKDIR /app/apps/web
RUN npm run build

# Production static serving with Nginx
FROM nginx:alpine AS runner

# Copy compiled React/Vite application
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Nginx SPA routing fallback
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]