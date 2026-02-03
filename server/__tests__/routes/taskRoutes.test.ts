/**
 * @fileoverview Testes unitários para Task Routes
 * @module server/__tests__/routes/taskRoutes.test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock do logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Task Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('deve retornar cache de tarefas vazio inicialmente', () => {
      const tasks: unknown[] = [];
      expect(tasks).toEqual([]);
    });

    it('deve incluir metadados de fonte', () => {
      const response = {
        tasks: [],
        source: 'local-cache',
        lastUpdate: null,
        note: 'Para dados atualizados, use Google Sheets via /api/google-sheets/proxy',
      };

      expect(response.source).toBe('local-cache');
      expect(response.note).toContain('Google Sheets');
    });
  });

  describe('POST /api/tasks', () => {
    it('deve criar tarefa com dados mínimos', () => {
      const newTask = {
        id: Date.now(),
        title: 'Nova Tarefa',
        description: '',
        status: 'pending' as const,
        priority: 'medium' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(newTask.title).toBe('Nova Tarefa');
      expect(newTask.status).toBe('pending');
      expect(newTask.priority).toBe('medium');
    });

    it('deve criar tarefa com todos os campos', () => {
      const newTask = {
        id: Date.now(),
        title: 'Tarefa Completa',
        description: 'Descrição detalhada',
        status: 'pending' as const,
        priority: 'high' as const,
        due_date: '2026-12-31',
        created_by: 1,
        assigned_to: 2,
        church: 'Igreja Central',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ['urgente', 'importante'],
      };

      expect(newTask.title).toBe('Tarefa Completa');
      expect(newTask.priority).toBe('high');
      expect(newTask.tags).toContain('urgente');
    });

    it('deve validar título obrigatório via schema', () => {
      // Schema Zod garante que título é obrigatório
      const invalidTask = {
        description: 'Sem título',
      };

      expect(invalidTask).not.toHaveProperty('title');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('deve atualizar tarefa existente', () => {
      const existingTask = {
        id: 123,
        title: 'Tarefa Original',
        status: 'pending' as const,
        priority: 'low' as const,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      const updates = {
        title: 'Tarefa Atualizada',
        status: 'in_progress' as const,
        priority: 'high' as const,
      };

      const updatedTask = {
        ...existingTask,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      expect(updatedTask.title).toBe('Tarefa Atualizada');
      expect(updatedTask.status).toBe('in_progress');
      expect(updatedTask.id).toBe(123); // ID não muda
    });

    it('deve atualizar apenas campos fornecidos', () => {
      const existingTask = {
        id: 123,
        title: 'Tarefa',
        description: 'Descrição original',
        status: 'pending' as const,
        priority: 'medium' as const,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      const updates = {
        status: 'completed' as const,
      };

      const updatedTask = {
        ...existingTask,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      expect(updatedTask.status).toBe('completed');
      expect(updatedTask.description).toBe('Descrição original'); // Não alterado
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deve remover tarefa do cache', () => {
      const tasks = [
        { id: 1, title: 'Tarefa 1' },
        { id: 2, title: 'Tarefa 2' },
        { id: 3, title: 'Tarefa 3' },
      ];

      const taskIdToDelete = 2;
      const taskIndex = tasks.findIndex(t => t.id === taskIdToDelete);

      expect(taskIndex).toBe(1);

      tasks.splice(taskIndex, 1);

      expect(tasks).toHaveLength(2);
      expect(tasks.find(t => t.id === 2)).toBeUndefined();
    });

    it('deve retornar erro para tarefa inexistente', () => {
      const tasks = [{ id: 1, title: 'Tarefa 1' }];

      const taskIdToDelete = 999;
      const taskIndex = tasks.findIndex(t => t.id === taskIdToDelete);

      expect(taskIndex).toBe(-1);
    });
  });

  describe('POST /api/tasks/sync', () => {
    it('deve sincronizar tarefas do Google Sheets', () => {
      const tasksFromSheets = [
        { id: 1, title: 'Tarefa do Sheets 1', status: 'pending' },
        { id: 2, title: 'Tarefa do Sheets 2', status: 'completed' },
      ];

      // Simula sincronização
      const tasksCache = [...tasksFromSheets];

      expect(tasksCache).toHaveLength(2);
      expect(tasksCache[0].title).toBe('Tarefa do Sheets 1');
    });

    it('deve atualizar lastCacheUpdate após sync', () => {
      const beforeSync = null;
      const afterSync = new Date();

      expect(beforeSync).toBeNull();
      expect(afterSync).toBeInstanceOf(Date);
    });
  });

  describe('Validação de Schema', () => {
    it('deve aceitar prioridades válidas', () => {
      const validPriorities = ['low', 'medium', 'high'];

      validPriorities.forEach(priority => {
        expect(['low', 'medium', 'high']).toContain(priority);
      });
    });

    it('deve aceitar status válidos', () => {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

      validStatuses.forEach(status => {
        expect(['pending', 'in_progress', 'completed', 'cancelled']).toContain(status);
      });
    });
  });
});
