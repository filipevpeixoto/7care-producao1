/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server', '<rootDir>/client/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'server/**/*.ts',
    'client/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!server/__tests__/**',
    '!client/src/__tests__/**'
  ],
  coverageThreshold: {
    'server/utils/permissions.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'server/utils/parsers.ts': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'server/middleware/validation.ts': {
      branches: 70,
      functions: 90,
      lines: 80,
      statements: 80
    },
    'server/schemas/index.ts': {
      branches: 90,
      functions: 0,
      lines: 90,
      statements: 90
    }
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageDirectory: '<rootDir>/coverage',
  verbose: true
};
