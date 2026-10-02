import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Gym Tracker',
        short_name: 'Gym Tracker',
        description: 'Track every gym session, log your sets, and watch your strength climb.',
        theme_color: '#0c0a09',
        background_color: '#0c0a09',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/auth/, /supabase/],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Handles taps on timer notifications (see src/lib/timerNotify.ts).
        importScripts: ['sw-notifications.js'],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split heavy vendors into cacheable chunks. Dynamically-imported
        // libraries (jspdf/html2canvas) stay lazy even when grouped.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/recharts|d3-|victory-vendor|internmap/.test(id)) return 'charts';
          if (/jspdf|html2canvas|canvg|dompurify|raf|rgbcolor/.test(id)) return 'pdf';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('@tanstack')) return 'query';
          if (id.includes('react-router') || id.includes('@remix-run')) return 'router';
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod'))
            return 'forms';
          if (/[\\/]react[\\/]|[\\/]react-dom[\\/]|scheduler/.test(id)) return 'react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
