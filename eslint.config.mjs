import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  // Ignorar pastas geradas
  {
    ignores: [
      'dist/**',
      'dist-server/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'uploads/**',
      '*.config.cjs',
      '*.config.js',
      'scripts/**',
      'netlify/**',
    ],
  },

  // Regras base JS
  js.configs.recommended,

  // TypeScript recomendado (sem type-checking para ser rápido)
  ...tseslint.configs.recommended,

  // ========================================
  // Configuração para código do SERVIDOR
  // ========================================
  {
    files: ['server/**/*.ts', 'shared/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // ── Qualidade de Código ──
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unreachable-loop': 'error',
      'no-unused-private-class-members': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line'],
      'default-case-last': 'error',
      'no-else-return': 'warn',
      'no-lonely-if': 'off',
      'no-nested-ternary': 'off',
      'no-unneeded-ternary': 'error',
      'prefer-template': 'warn',
      'object-shorthand': 'warn',
      'prefer-arrow-callback': 'warn',
      'no-useless-return': 'error',
      'no-useless-rename': 'error',
      'no-useless-concat': 'warn',

      // ── TypeScript ──
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-require-imports': 'off', // Alguns scripts usam require
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },

  // ========================================
  // Configuração para código do CLIENTE (React)
  // ========================================
  {
    files: ['client/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // ── React Hooks ──
      ...reactHooks.configs.recommended.rules,

      // ── React Refresh ──
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ── Qualidade de Código ──
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line'],
      'no-nested-ternary': 'off',
      'no-unneeded-ternary': 'error',
      'prefer-template': 'warn',
      'object-shorthand': 'warn',
      'prefer-arrow-callback': 'warn',
      'no-useless-return': 'error',
      'no-useless-rename': 'error',

      // ── TypeScript ──
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/incompatible-library': 'off',
    },
  },

  // ========================================
  // UI Components & Libraries (multi-export ok)
  // ========================================
  {
    files: [
      'client/src/components/ui/**',
      'client/src/components/election/**',
      'client/src/components/settings/**',
      'client/src/utils/lazyLoading.tsx',
      'client/src/lib/animations.tsx',
      'client/src/contexts/**',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // ========================================
  // Logging & Performance (console.log is intentional)
  // ========================================
  {
    files: [
      'client/src/lib/logger.ts',
      'client/src/lib/performance.ts',
      'client/src/components/ErrorBoundary.tsx',
    ],
    rules: {
      'no-console': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  // ========================================
  // Configuração para TESTES
  // ========================================
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'e2e/**/*.ts', 'tests/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
