import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // ===============================================
      // REGRAS CRÍTICAS DE SEGURANÇA - SEMPRE ATIVAS
      // ===============================================
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-var': 'error',
      
      // ===============================================
      // REGRAS DE QUALIDADE - STRICTO PARA 10/10
      // ===============================================
      
      // Igualdade estrita - crítico para evitar bugs
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      
      // Preferir const para variáveis não reatribuídas
      'prefer-const': 'error',
      
      // Auto-remover imports não utilizados
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', {
        vars: 'all',
        varsIgnorePattern: '^_|^handle|^set|^loading|^refresh|^clear|^toggle|^filtered|^is|^can|^get|^display|^result|^current|^show|^import|^subscriptions|^editing|^stats|^total|^source|^now|^extraData|^headers|^user$|^toast$|^lastUpdate$|^index$|^checked$|^mock|^action|^nav$|^prev|^request|^NEW_|^logout$|^electionId$',
        args: 'after-used',
        argsIgnorePattern: '^_|^req$|^res$|^next$|^event$|^index$|^checked$|^err$|^electionId$',
        caughtErrorsIgnorePattern: '^_|^error$|^err$|^e$|^parseError$',
        ignoreRestSiblings: true,
        destructuredArrayIgnorePattern: '^_'
      }],
      
      // Desativar a regra original em favor do plugin
      '@typescript-eslint/no-unused-vars': 'off',
      
      // Any explícito - desativado (muitos casos legítimos em migrações e tipos externos)
      '@typescript-eslint/no-explicit-any': 'off',
      
      // Imports duplicados
      'no-duplicate-imports': 'error',
      
      // Expressões binárias constantes - off (casos legítimos)
      'no-constant-binary-expression': 'off',
      
      // Curly braces para blocos - melhora legibilidade
      curly: ['error', 'multi-line'],
      
      // Console.log - warn para lembrar de remover
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      
      // Return await desnecessário
      'no-return-await': 'error',
      
      // Throw apenas Error objects
      'no-throw-literal': 'error',
      
      // Preferir template literals
      'prefer-template': 'warn',
      
      // ===============================================
      // REGRAS DESATIVADAS - RUÍDO EXCESSIVO
      // ===============================================
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-unused-expressions': 'off',
      'no-case-declarations': 'off',
      'no-empty': 'off',
    },
  },
  {
    // Permitir console.log em todo o código - necessário para debug e logs
    files: [
      'server/**/*.ts',
      'client/src/**/*.ts',
      'client/src/**/*.tsx',
      'tests/**',
      'e2e/**',
      'run-migrations.ts',
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'netlify/functions/',
      'uploads/',
      'client/public/**',
      '**/*.js',
    ],
  }
);
