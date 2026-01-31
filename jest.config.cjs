/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Ignorar testes client-side que requerem Vite (import.meta.env)
  // Esses testes devem ser executados com Vitest
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/client/src/'
  ],
  collectCoverageFrom: [
    'server/**/*.ts',
    'server/services/**/*.ts',
    'server/repositories/**/*.ts',
    'server/utils/**/*.ts',
    'server/middleware/**/*.ts',
    'client/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!server/__tests__/**',
    '!client/src/__tests__/**',
    '!server/migrations/**',
    '!server/swagger/**'
  ],
  coverageThreshold: {
    // Threshold global - valores realistas baseados na cobertura atual do projeto
    // Meta progressiva: aumentar gradualmente conforme mais testes são adicionados
    global: {
      branches: 5,
      functions: 10,
      lines: 9,
      statements: 9
    },
    // Arquivos críticos com threshold mais alto - já têm boa cobertura
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
    },
    // Services - threshold realista baseado na cobertura atual
    'server/services/authService.ts': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
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
