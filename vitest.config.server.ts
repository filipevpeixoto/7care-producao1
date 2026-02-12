import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config for server-side (Node) tests.
 * Run with: npx vitest run --config vitest.config.server.ts
 */
export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  test: {
    environment: 'node',
    include: ['server/__tests__/**/*.test.ts'],
    exclude: ['server/__tests__/manual/**'],
    setupFiles: ['server/__tests__/setup.ts'],
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      reportsDirectory: './coverage/server',
      include: ['server/**/*.ts'],
      exclude: [
        'server/**/*.test.ts',
        'server/__tests__/**',
        'server/migrations/**',
        'server/swagger/**',
      ],
      thresholds: {
        statements: 35,
        branches: 25,
        functions: 30,
        lines: 35,
      },
    },
  },
});
