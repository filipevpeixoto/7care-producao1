/**
 * Testes para o gerenciador de sincronização
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import 'fake-indexeddb/auto';
import {
  processQueue,
  forceSync,
  addSyncListener,
  setupAutoSync,
} from '../syncManager';
import {
  db,
  addToSyncQueue,
} from '../database';

// Tipo para o mock do fetch
type MockFetch = jest.MockedFunction<typeof fetch>;

// Mock do fetch
const mockFetch = jest.fn() as MockFetch;
(global as unknown as { fetch: MockFetch }).fetch = mockFetch;

describe('Sync Manager Module', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await db.syncQueue.clear();
    
    // Default mock para fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);
  });

  describe('processQueue', () => {
    it('deve processar fila vazia sem erros', async () => {
      const result = await processQueue();
      
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('deve processar item de criação', async () => {
      await addToSyncQueue({
        type: 'create',
        entity: 'users',
        data: JSON.stringify({ name: 'Novo' }),
        endpoint: '/api/users',
        method: 'POST',
      });

      const result = await processQueue();
      
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
        method: 'POST',
      }));
    });

    it('deve processar item de atualização', async () => {
      await addToSyncQueue({
        type: 'update',
        entity: 'events',
        entityId: 5,
        data: JSON.stringify({ title: 'Atualizado' }),
        endpoint: '/api/events/5',
        method: 'PUT',
      });

      const result = await processQueue();
      
      expect(result.success).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/events/5', expect.objectContaining({
        method: 'PUT',
      }));
    });

    it('deve processar item de exclusão', async () => {
      await addToSyncQueue({
        type: 'delete',
        entity: 'tasks',
        entityId: 10,
        data: '',
        endpoint: '/api/tasks/10',
        method: 'DELETE',
      });

      const result = await processQueue();
      
      expect(result.success).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks/10', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    it('deve lidar com falha na requisição', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      // Adicionar item com retryCount já no máximo para que falhe imediatamente
      await db.syncQueue.add({
        type: 'create',
        entity: 'users',
        data: JSON.stringify({}),
        endpoint: '/api/users',
        method: 'POST',
        createdAt: Date.now(),
        retryCount: 5, // MAX_RETRIES = 5
        nextRetryAt: 0,
        priority: 1,
      });

      const result = await processQueue();
      
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('deve processar múltiplos itens na ordem correta', async () => {
      await addToSyncQueue({
        type: 'create',
        entity: 'users',
        data: JSON.stringify({ order: 1 }),
        endpoint: '/api/users',
        method: 'POST',
      });
      
      await addToSyncQueue({
        type: 'create',
        entity: 'users',
        data: JSON.stringify({ order: 2 }),
        endpoint: '/api/users',
        method: 'POST',
      });

      await processQueue();
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Verificar ordem das chamadas
      const firstCall = mockFetch.mock.calls[0] as [string, RequestInit];
      const secondCall = mockFetch.mock.calls[1] as [string, RequestInit];
      
      const firstBody = JSON.parse(firstCall[1].body as string);
      const secondBody = JSON.parse(secondCall[1].body as string);
      
      expect(firstBody.order).toBe(1);
      expect(secondBody.order).toBe(2);
    });
  });

  describe('forceSync', () => {
    beforeEach(() => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    it('deve forçar sincronização quando online', async () => {
      await addToSyncQueue({
        type: 'create',
        entity: 'tasks',
        data: JSON.stringify({}),
        endpoint: '/api/tasks',
        method: 'POST',
      });

      const result = await forceSync();
      
      expect(result.success).toBe(1);
    });

    it('não deve sincronizar quando offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      await addToSyncQueue({
        type: 'create',
        entity: 'tasks',
        data: JSON.stringify({}),
        endpoint: '/api/tasks',
        method: 'POST',
      });

      const result = await forceSync();
      
      expect(result.success).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('addSyncListener', () => {
    it('deve adicionar e remover listener', async () => {
      const listener = jest.fn();
      const unsubscribe = addSyncListener(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Remover listener
      unsubscribe();
      
      // Deve funcionar sem erros
      expect(() => unsubscribe()).not.toThrow();
    });

    it('deve notificar listeners durante sync', async () => {
      // Garantir que navigator.onLine está true
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const listener = jest.fn();
      addSyncListener(listener);

      await addToSyncQueue({
        type: 'create',
        entity: 'events',
        data: JSON.stringify({}),
        endpoint: '/api/events',
        method: 'POST',
      });

      await processQueue();
      
      // Listener deve ser chamado com status
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('setupAutoSync', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('deve configurar auto sync', () => {
      expect(() => setupAutoSync()).not.toThrow();
    });
  });
});
