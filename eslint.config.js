import eslint from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const commonJsGlobals = {
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
  global: 'readonly',
  Buffer: 'readonly',
};

const serviceWorkerGlobals = {
  self: 'readonly',
  caches: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  Response: 'readonly',
  location: 'readonly',
  registration: 'readonly',
  skipWaiting: 'readonly',
  clients: 'readonly',
  Promise: 'readonly',
  Request: 'readonly',
  Headers: 'readonly',
};

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Promise: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        InputEvent: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        IDBIndex: 'readonly',
        IDBObjectStore: 'readonly',
        IDBTransaction: 'readonly',
        IDBDatabase: 'readonly',
        import: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['init-test-data.js', 'main.cjs'],
    languageOptions: {
      globals: commonJsGlobals,
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-async-promise-executor': 'off',
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      globals: serviceWorkerGlobals,
    },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
      'e2e/**',
      'playwright.config.ts',
      'win7-dist/**',
      'win7-post-build.cjs',
    ],
  },
];