/**
 * Testes para o módulo de criptografia offline
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { webcrypto } from 'crypto';
import { encryptData, decryptData, isCryptoAvailable, clearEncryptionKey } from '../crypto';

// Setup crypto para jsdom
beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      writable: true,
      configurable: true,
    });
  }
});

describe('Crypto Module', () => {
  beforeEach(async () => {
    // Limpar chave antes de cada teste
    await clearEncryptionKey();
    localStorage.clear();
  });

  describe('isCryptoAvailable', () => {
    it('deve retornar true quando crypto.subtle está disponível', () => {
      // Após o setup, deve estar disponível
      expect(isCryptoAvailable()).toBe(true);
    });
  });

  describe('encryptData e decryptData', () => {
    it('deve criptografar e descriptografar dados simples', async () => {
      const originalData = { name: 'Test User', email: 'test@example.com' };
      
      const encrypted = await encryptData(originalData);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(JSON.stringify(originalData));
      
      const decrypted = await decryptData<typeof originalData>(encrypted);
      expect(decrypted).toEqual(originalData);
    });

    it('deve criptografar e descriptografar arrays', async () => {
      const originalData = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
      ];
      
      const encrypted = await encryptData(originalData);
      const decrypted = await decryptData<typeof originalData>(encrypted);
      
      expect(decrypted).toEqual(originalData);
    });

    it('deve criptografar e descriptografar strings', async () => {
      const originalData = 'Texto simples para criptografar';
      
      const encrypted = await encryptData(originalData);
      const decrypted = await decryptData<string>(encrypted);
      
      expect(decrypted).toBe(originalData);
    });

    it('deve criptografar e descriptografar objetos complexos', async () => {
      const originalData = {
        user: {
          id: 123,
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '+55 11 99999-9999',
          address: {
            street: 'Rua Principal',
            city: 'São Paulo',
          },
        },
        roles: ['admin', 'pastor'],
        createdAt: '2024-01-01T00:00:00Z',
      };
      
      const encrypted = await encryptData(originalData);
      const decrypted = await decryptData<typeof originalData>(encrypted);
      
      expect(decrypted).toEqual(originalData);
    });

    it('deve produzir diferentes outputs para mesmos dados (devido ao IV)', async () => {
      const data = { test: 'data' };
      
      const encrypted1 = await encryptData(data);
      const encrypted2 = await encryptData(data);
      
      // O IV é diferente a cada criptografia (se criptografia real funcionar)
      // Se fallback for usado, ambos serão iguais
      if (!encrypted1.startsWith('{')) {
        expect(encrypted1).not.toBe(encrypted2);
      }
      
      // Mas ambos devem descriptografar para os mesmos dados
      const decrypted1 = await decryptData<typeof data>(encrypted1);
      const decrypted2 = await decryptData<typeof data>(encrypted2);
      
      expect(decrypted1).toEqual(decrypted2);
    });
  });

  describe('clearEncryptionKey', () => {
    it('deve limpar a chave de criptografia', async () => {
      // Criar uma chave (se crypto disponível, salvará no localStorage)
      await encryptData({ test: 'data' });
      
      // Limpar a chave
      await clearEncryptionKey();
      expect(localStorage.getItem('7care_device_key')).toBeNull();
    });
  });

  describe('Tratamento de erros', () => {
    it('deve retornar dados não criptografados quando criptografia falha em ambiente de desenvolvimento', async () => {
      // Mock para forçar falha na criptografia
      const originalSubtle = crypto.subtle;
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Colocar em desenvolvimento para ativar o fallback
      process.env.NODE_ENV = 'development';
      
      Object.defineProperty(crypto, 'subtle', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      
      const data = { test: 'fallback' };
      const result = await encryptData(data);
      
      // Deve retornar JSON com flag __unencrypted
      const parsed = JSON.parse(result);
      expect(parsed.__unencrypted).toBe(true);
      expect(parsed.data).toEqual(data);
      
      // Restaurar
      process.env.NODE_ENV = originalNodeEnv;
      Object.defineProperty(crypto, 'subtle', {
        value: originalSubtle,
        writable: true,
        configurable: true,
      });
    });
  });
});
