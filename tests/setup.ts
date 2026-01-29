/**
 * Jest Global Setup
 * Configurações globais para todos os testes
 */

import { jest, beforeAll, afterAll, afterEach, expect } from '@jest/globals';
import { webcrypto } from 'crypto';
import { TextEncoder, TextDecoder } from 'util';

// Mock para import.meta.env (usado em arquivos Vite)
// @ts-expect-error - definindo import.meta para ambiente de teste
globalThis.import = {
  meta: {
    env: {
      DEV: false,
      PROD: true,
      MODE: 'test',
      BASE_URL: '/',
      SSR: false,
    },
  },
};

// Polyfill para TextEncoder/TextDecoder (necessário para crypto)
if (typeof globalThis.TextEncoder === 'undefined') {
  (globalThis as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder;
}

// Polyfill para structuredClone (necessário para fake-indexeddb)
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

// Polyfill para Web Crypto API (necessário para testes de criptografia)
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}

// Aumentar timeout para testes de integração
jest.setTimeout(30000);

// Mock de variáveis de ambiente
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mock://localhost/test';

// Silenciar console durante testes (exceto erros)
const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  // Manter console.error para debugging
});

afterAll(() => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
});

// Limpar mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

// Tipos globais para testes
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Matcher customizado para ranges
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

export {};
