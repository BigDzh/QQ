import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2015',
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('jspdf')) {
              return 'vendor-jspdf';
            }
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas';
            }
            if (id.includes('pdf-parse')) {
              return 'vendor-pdfparse';
            }
            if (id.includes('tesseract.js')) {
              return 'vendor-ocr';
            }
            if (id.includes('jszip')) {
              return 'vendor-jszip';
            }
            if (id.includes('crypto-js')) {
              return 'vendor-crypto';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('idb') || id.includes('mammoth')) {
              return 'vendor-db';
            }
          }
        },
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name || 'chunk';
          const hash = chunkInfo.hash?.slice(0, 8) || '00000000';
          if (name.startsWith('vendor-')) {
            return `assets/vendor/${name}-${hash}.js`;
          }
          if (name.startsWith('page-')) {
            return `assets/pages/${name}-${hash}.js`;
          }
          return `assets/${name}-${hash}.js`;
        },
        entryFileNames: (entryInfo) => {
          const name = entryInfo.name || 'entry';
          const hash = entryInfo.hash?.slice(0, 8) || '00000000';
          return `assets/${name}-${hash}.js`;
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || 'asset';
          const hash = assetInfo.hash?.slice(0, 8) || '00000000';
          const ext = name.split('.').pop() || '';
          if (['css'].includes(ext)) {
            return `assets/css/${name}-${hash}.[ext]`;
          }
          if (['woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
            return `assets/fonts/${name}-${hash}.[ext]`;
          }
          if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
            return `assets/images/${name}-${hash}.[ext]`;
          }
          return `assets/${name}-${hash}.[ext]`;
        },
      },
    },
  },
  server: {
    port: 5174,
    open: false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
    exclude: [
      'recharts',
      'xlsx',
      'jspdf',
      'html2canvas',
      'pdf-parse',
      'tesseract.js',
    ],
  },
  preview: {
    port: 4173,
  },
})