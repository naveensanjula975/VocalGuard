import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'VocalGuard',
        short_name: 'VocalGuard',
        description: 'Vocal AI Deepfake Detection Application',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],

  build: {
    // Raise the warning threshold slightly — after chunking the main bundle
    // will be well under 500 kB, but keep it low enough to catch regressions.
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        /**
         * Split heavy vendor dependencies into dedicated chunks.
         *
         * Benefits:
         *  - Users who only visit the landing page never download chart.js
         *  - Vendor chunks have aggressive cache lifetimes because their
         *    content only changes when the dependency version changes
         *  - The main index chunk becomes much smaller (~300 kB → ~100 kB)
         */
        manualChunks: {
          // Chart.js + react-chartjs-2 (~200 kB)
          'vendor-charts': ['chart.js', 'react-chartjs-2'],

          // PDF generation libs (~120 kB)
          'vendor-pdf': ['jspdf', 'dom-to-image'],

          // Social share buttons (~50 kB)
          'vendor-share': ['react-share'],

          // React core — rarely changes, great cache candidate
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
