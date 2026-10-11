/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createHash } from 'crypto';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'driver-offline-shell',
      apply: 'build',
      generateBundle(_options, bundle) {
        const files = [
          '/',
          '/index.html',
          ...Object.keys(bundle)
            .filter((p) => /\.(js|css)$/.test(p))
            .map((p) => '/' + p),
        ];
        const version = createHash('sha256').update(files.join(',')).digest('hex').slice(0, 12);
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `
const CACHE = 'waypoint-shell-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('waypoint-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
  else if (FILES.includes(url.pathname)) event.respondWith(caches.match(event.request).then(saved => saved || fetch(event.request)));
});`,
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@waypoint/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
