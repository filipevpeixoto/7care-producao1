/**
 * Testes para o banco de dados offline (IndexedDB)
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import 'fake-indexeddb/auto';
import {
  db,
  saveUsersOffline,
  getUsersOffline,
  saveEventsOffline,
  getEventsOffline,
  saveTasksOffline,
  getTasksOffline,
  addToSyncQueue,
  getSyncQueue,
  removeSyncQueueItem,
  getSyncQueueCount,
  cleanExpiredData,
  getStorageUsage,
} from '../database';

// Mock do crypto
jest.mock('../crypto', () => ({
  encryptData: jest.fn((data: unknown) => Promise.resolve(JSON.stringify({ __mock: true, data }))),
  decryptData: jest.fn((str: string) => {
    const parsed = JSON.parse(str);
    return Promise.resolve(parsed.data || parsed);
  }),
  hashData: jest.fn((data: string) => Promise.resolve(`mock-hash-${data.length}`)),
}));

describe('Offline Database Module', () => {
  beforeEach(async () => {
    // Limpar banco antes de cada teste
    await db.users.clear();
    await db.events.clear();
    await db.tasks.clear();
    await db.messages.clear();
    await db.syncQueue.clear();
    await db.meta.clear();
  });

  describe('Users (Criptografados)', () => {
    const mockUsers = [
      { id: 1, name: 'João', email: 'joao@test.com', role: 'member' },
      { id: 2, name: 'Maria', email: 'maria@test.com', role: 'pastor' },
    ];

    it('deve salvar usuários com permissão de admin', async () => {
      await saveUsersOffline(mockUsers as any, 'superadmin');
      
      const count = await db.users.count();
      expect(count).toBe(2);
    });

    it('não deve salvar usuários sem permissão', async () => {
      await saveUsersOffline(mockUsers as any, 'member');
      
      const count = await db.users.count();
      expect(count).toBe(0);
    });

    it('deve salvar usuários com permissão de pastor', async () => {
      await saveUsersOffline(mockUsers as any, 'pastor');
      
      const count = await db.users.count();
      expect(count).toBe(2);
    });

    it('deve recuperar usuários salvos', async () => {
      await saveUsersOffline(mockUsers as any, 'superadmin');
      
      const retrieved = await getUsersOffline();
      expect(retrieved.length).toBe(2);
    });
  });

  describe('Events', () => {
    const mockEvents = [
      { id: 1, title: 'Culto', date: '2024-01-15' },
      { id: 2, title: 'Reunião', date: '2024-01-16' },
    ];

    it('deve salvar eventos', async () => {
      await saveEventsOffline(mockEvents as any);
      
      const count = await db.events.count();
      expect(count).toBe(2);
    });

    it('deve recuperar eventos salvos', async () => {
      await saveEventsOffline(mockEvents as any);
      
      const retrieved = await getEventsOffline();
      expect(retrieved.length).toBe(2);
    });
  });

  describe('Tasks', () => {
    const mockTasks = [
      { id: 1, title: 'Tarefa 1', status: 'pending' },
      { id: 2, title: 'Tarefa 2', status: 'completed' },
    ];

    it('deve salvar tarefas', async () => {
      await saveTasksOffline(mockTasks as any);
      
      const count = await db.tasks.count();
      expect(count).toBe(2);
    });

    it('deve recuperar tarefas salvas', async () => {
      await saveTasksOffline(mockTasks as any);
      
      const retrieved = await getTasksOffline();
      expect(retrieved.length).toBe(2);
    });
  });

  describe('Sync Queue', () => {
    it('deve adicionar item à fila de sync', async () => {
      const id = await addToSyncQueue({
        type: 'create',
        entity: 'users',
        data: JSON.stringify({ name: 'Novo Usuário' }),
        endpoint: '/api/users',
        method: 'POST',
      });

      expect(id).toBeDefined();
      
      const queue = await getSyncQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('create');
      expect(queue[0].entity).toBe('users');
    });

    it('deve remover item da fila de sync', async () => {
      const id = await addToSyncQueue({
        type: 'update',
        entity: 'events',
        entityId: 1,
        data: JSON.stringify({ title: 'Atualizado' }),
        endpoint: '/api/events/1',
        method: 'PUT',
      });

      await removeSyncQueueItem(id);
      
      const count = await getSyncQueueCount();
      expect(count).toBe(0);
    });

    it('deve contar itens na fila', async () => {
      await addToSyncQueue({
        type: 'create',
        entity: 'tasks',
        data: JSON.stringify({}),
        endpoint: '/api/tasks',
        method: 'POST',
      });
      
      await addToSyncQueue({
        type: 'delete',
        entity: 'tasks',
        entityId: 5,
        data: '',
        endpoint: '/api/tasks/5',
        method: 'DELETE',
      });

      const count = await getSyncQueueCount();
      expect(count).toBe(2);
    });

    it('deve ordenar fila por data de criação', async () => {
      await addToSyncQueue({
        type: 'create',
        entity: 'users',
        data: '1',
        endpoint: '/api/users',
        method: 'POST',
      });
      
      // Pequeno delay para garantir ordem
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await addToSyncQueue({
        type: 'update',
        entity: 'users',
        entityId: 1,
        data: '2',
        endpoint: '/api/users/1',
        method: 'PUT',
      });

      const queue = await getSyncQueue();
      expect(queue[0].data).toBe('1');
      expect(queue[1].data).toBe('2');
    });
  });

  describe('Storage Management', () => {
    it('deve retornar uso de armazenamento', async () => {
      const { used, limit } = await getStorageUsage();
      
      expect(typeof used).toBe('number');
      expect(typeof limit).toBe('number');
      expect(limit).toBeGreaterThan(0);
    });

    it('deve limpar dados expirados', async () => {
      // Adicionar dados antigos (simulando)
      await db.users.add({
        id: 999,
        data: 'old_data',
        syncedAt: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 dias atrás
        isModified: false,
        checksum: 'test-checksum',
        modifiedAt: Date.now(),
        version: 1,
      });

      await cleanExpiredData();
      
      const user = await db.users.get(999);
      expect(user).toBeUndefined();
    });
  });
});
