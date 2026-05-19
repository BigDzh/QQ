import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Performance optimization plugin
function performancePlugin(): Plugin {
  return {
    name: 'vite-performance-plugin',
    config(config) {
      if (config.build?.sourcemap === false && process.env.NODE_ENV === 'production') {
        console.log('\n🚀 Production build optimizations enabled:\n');
        console.log('   ✅ Minification: terser');
        console.log('   ✅ Code splitting: enabled');
        console.log('   ✅ Tree shaking: enabled');
        console.log('   ✅ Asset optimization: enabled\n');
      }
    },
    closeBundle() {
      if (process.env.NODE_ENV === 'production') {
        const fs = require('fs');
        const path = require('path');
        
        // Analyze bundle size
        const distPath = path.resolve(__dirname, 'dist');
        let totalSize = 0;
        
        function getDirSize(dirPath: string): number {
          let size = 0;
          try {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
              const filePath = path.join(dirPath, file);
              const stat = fs.statSync(filePath);
              if (stat.isDirectory()) {
                size += getDirSize(filePath);
              } else {
                size += stat.size;
              }
            }
          } catch (e) {
            // Ignore errors
          }
          return size;
        }
        
        totalSize = getDirSize(distPath);
        
        function formatBytes(bytes: number): string {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        console.log('📦 Build Output Analysis:');
        console.log(`   Total size: ${formatBytes(totalSize)}`);
        console.log(`   Location: ${distPath}\n`);
      }
    },
  };
}

// Route-based code splitting configuration
const routeChunks = [
  { pattern: '/login', name: 'page-login' },
  { pattern: '/dashboard', name: 'page-dashboard' },
  { pattern: '/projects', name: 'page-projects' },
  { pattern: '/tasks', name: 'page-tasks' },
  { pattern: '/settings', name: 'page-settings' },
];

export default defineConfig({
  plugins: [react(), performancePlugin()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@context': path.resolve(__dirname, './src/context'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  
  base: './',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    
    // Source maps - disable in production for smaller bundles
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // Target modern browsers for better optimization
    target: 'es2020',
    
    // Use terser for better minification in production
    minify: 'terser',
    
    // Terser configuration
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    
    // Chunk size warning limit (increased for vendor chunks)
    chunkSizeWarningLimit: 500,
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Generate manifest for long-term caching
    manifest: true,
    
    rollupOptions: {
      output: {
        // Manual chunk splitting strategy
        manualChunks(id) {
          // React core (keep together)
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          
          // Router
          if (id.includes('react-router-dom')) {
            return 'vendor-router';
          }
          
          // Charts library (large)
          if (id.includes('recharts')) {
            return 'vendor-charts';
          }
          
          // PDF generation libraries
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'vendor-pdf';
          }
          
          // OCR/Text recognition
          if (id.includes('tesseract.js')) {
            return 'vendor-ocr';
          }
          
          // Database/Storage
          if (id.includes('idb') || id.includes('mammoth') || id.includes('sql.js')) {
            return 'vendor-db';
          }
          
          // Crypto utilities
          if (id.includes('crypto-js')) {
            return 'vendor-crypto';
          }
          
          // File handling
          if (id.includes('jszip') || id.includes('file-saver') || id.includes('xlsx')) {
            return 'vendor-files';
          }
          
          // Icons
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          
          // UI components (if using any UI library)
          if (id.includes('@mui') || id.includes('antd') || id.includes('shadcn')) {
            return 'vendor-ui';
          }
          
          // Utilities
          if (id.includes('lodash') || id.includes('dayjs') || id.includes('date-fns')) {
            return 'vendor-utils';
          }
        },
        
        // Optimized file naming with content hash for caching
        chunkFileNames(chunkInfo) {
          const name = chunkInfo.name || 'chunk';
          const hash = chunkInfo.facadeModuleId ? 
            chunkInfo.hash?.slice(0, 8) || '00000000' : 
            '';
          
          if (name.startsWith('vendor-')) {
            return `assets/vendor/${name}-${hash}.js`;
          }
          if (name.startsWith('page-')) {
            return `assets/pages/${name}-${hash}.js`;
          }
          return `assets/${name}-${hash}.js`;
        },
        
        entryFileNames(entryInfo) {
          const hash = entryInfo.hash?.slice(0, 8) || '00000000';
          return `assets/main-${hash}.js`;
        },
        
        assetFileNames(assetInfo) {
          const name = assetInfo.name || 'asset';
          const hash = assetInfo.hash?.slice(0, 8) || '00000000';
          const ext = name.split('.').pop() || '';
          
          // Organize assets by type
          if (['css'].includes(ext)) {
            return `assets/css/${name.replace(/\.css$/, '')}-${hash}.[ext]`;
          }
          if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext)) {
            return `assets/fonts/${name}-${hash}.[ext]`;
          }
          if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'avif'].includes(ext)) {
            return `assets/images/${name}-${hash}.[ext]`;
          }
          if (['mp3', 'wav', 'ogg'].includes(ext)) {
            return `assets/audio/${name}-${hash}.[ext]`;
          }
          if (['mp4', 'webm'].includes(ext)) {
            return `assets/video/${name}-${hash}.[ext]`;
          }
          
          return `assets/${name}-${hash}.[ext]`;
        },
      },
      
      // External dependencies that shouldn't be bundled
      external: [],
    },
    
    // Report compressed size
    reportCompressedSize: true,
    
    // Generate chunk information
    generateBuildInfo: true,
    
    // CommonJS compatibility
    commonjsOptions: {
      ignoreDynamicRequires: false,
    },
  },
  
  server: {
    port: 5174,
    open: false,
    
    // Enable CORS for development
    cors: true,
    
    // Force dep rebuild on change
    force: true,
    
    // Optimize HMR
    hmr: {
      overlay: true,
      protocol: 'ws',
    },
    
    // Middleware support
    middlewareMode: false,
    
    // Proxy configuration (if needed)
    proxy: {},
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react/jsx-runtime',
      'lodash',
      'lodash/get',
      'lodash/set',
    ],
    exclude: [
      // Large dependencies that should be loaded on demand
      'jspdf',
      'html2canvas',
      'pdf-parse',
      'tesseract.js',
      'xlsx',
      'mammoth',
    ],
    
    // Pre-bundle optimizations
    esbuildOptions: {
      target: 'es2020',
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      },
    },
  },
  
  preview: {
    port: 4173,
    
    // Enable strict mode for better error detection
    strictPort: true,
  },
  
  // Environment-specific configurations
  define: {
    __DEV__: process.env.NODE_ENV !== 'production',
    __PROD__: process.env.NODE_ENV === 'production',
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  
  // CSS optimization
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
    preprocessorOptions: {},
    devSourcemap: false,
  },
})

// Export route chunks configuration for use in lazy loading
export { routeChunks };

// Utility function for creating lazy-loaded routes
export function createLazyRoute(importFn: () => Promise<any>) {
  return () => importFn();
}
