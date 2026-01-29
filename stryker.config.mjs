/**
 * @fileoverview Stryker Mutation Testing Configuration
 * @module stryker.config.mjs
 * 
 * Configuração para mutation testing - verifica a qualidade dos testes
 * encontrando mutações no código que não são capturadas pelos testes.
 */

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  // Projeto TypeScript
  mutator: {
    plugins: ["@stryker-mutator/typescript-checker"],
  },

  // Arquivos a mutar (apenas código do servidor por enquanto)
  mutate: [
    "server/**/*.ts",
    "!server/**/*.test.ts",
    "!server/__tests__/**/*",
    "!server/migrations/**/*",
    "!server/**/*.d.ts",
  ],

  // Usa Jest como test runner
  testRunner: "jest",
  jest: {
    projectType: "custom",
    configFile: "jest.config.cjs",
  },

  // Verificador de tipos
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",

  // Thresholds - se abaixo disso, mutation score é considerado insuficiente
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // Falha CI se score < 50%
  },

  // Concorrência
  concurrency: 4,

  // Timeouts
  timeoutMS: 60000,
  timeoutFactor: 2.5,

  // Reporters
  reporters: [
    "html",      // Relatório HTML detalhado
    "clear-text", // Output no terminal
    "progress",   // Barra de progresso
    "dashboard",  // Dashboard web (opcional)
  ],

  // Onde salvar relatórios
  htmlReporter: {
    fileName: "reports/mutation/mutation-report.html",
  },

  // Dashboard (se configurado)
  dashboard: {
    project: "7care",
    version: process.env.GITHUB_SHA || "local",
    module: "server",
    baseUrl: "https://dashboard.stryker-mutator.io",
    reportType: "full",
  },

  // Mutadores desabilitados (muito ruidosos ou falsos positivos)
  mutator: {
    excludedMutations: [
      "StringLiteral", // Strings literais geram muito ruído
    ],
  },

  // Ignora arquivos em certos casos
  disableTypeChecks: "server/**/*.ts",

  // Padrões para arquivos de teste
  testFrameworkOptions: {
    coverageAnalysis: "perTest",
  },

  // Incremental - apenas muta arquivos alterados (dev mode)
  incremental: true,
  incrementalFile: ".stryker-cache/incremental.json",

  // Limpa cache após cada run completo
  cleanTempDir: true,

  // Log level
  logLevel: "info",
};
