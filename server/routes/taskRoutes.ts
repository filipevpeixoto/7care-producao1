/**
 * Task Routes
 * Rotas para gerenciamento de tarefas
 * Nota: As tarefas principais são gerenciadas via Google Sheets,
 * esta rota serve como fallback/cache local
 */

import { Express, Request, Response } from 'express';
import { logger } from '../utils/logger';

// Interface para tarefa
interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_by?: number;
  assigned_to?: number;
  created_by_name?: string;
  assigned_to_name?: string;
  church?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  tags?: string[];
}

// Cache local de tarefas (em memória para fallback)
let tasksCache: Task[] = [];
let lastCacheUpdate: Date | null = null;

/**
 * Registra as rotas de tarefas
 */
export function taskRoutes(app: Express): void {
  
  /**
   * GET /api/tasks
   * Lista todas as tarefas (retorna cache local ou array vazio)
   * Nota: Frontend usa Google Sheets como fonte principal
   */
  app.get('/api/tasks', async (req: Request, res: Response) => {
    try {
      logger.info('📋 GET /api/tasks - Retornando cache de tarefas');
      
      res.json({
        tasks: tasksCache,
        source: 'local-cache',
        lastUpdate: lastCacheUpdate,
        note: 'Para dados atualizados, use Google Sheets via /api/google-sheets/proxy'
      });
    } catch (error) {
      logger.error('Erro ao buscar tarefas:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar tarefas',
        tasks: [] 
      });
    }
  });

  /**
   * POST /api/tasks
   * Cria uma nova tarefa no cache local
   */
  app.post('/api/tasks', async (req: Request, res: Response) => {
    try {
      const { title, description, priority, due_date, assigned_to, church, tags } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Título é obrigatório' });
      }

      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      
      const newTask: Task = {
        id: Date.now(),
        title,
        description: description || '',
        status: 'pending',
        priority: priority || 'medium',
        due_date,
        created_by: userId,
        assigned_to: assigned_to ? parseInt(assigned_to) : undefined,
        church: church || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: tags || []
      };

      tasksCache.push(newTask);
      lastCacheUpdate = new Date();

      logger.info(`✅ Tarefa criada localmente: ${newTask.id}`);
      return res.status(201).json(newTask);
    } catch (error) {
      logger.error('Erro ao criar tarefa:', error);
      return res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
  });

  /**
   * PUT /api/tasks/:id
   * Atualiza uma tarefa no cache local
   */
  app.put('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      const taskIndex = tasksCache.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
      }

      const updates = req.body;
      tasksCache[taskIndex] = {
        ...tasksCache[taskIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };

      lastCacheUpdate = new Date();
      
      logger.info(`✅ Tarefa atualizada: ${taskId}`);
      return res.json(tasksCache[taskIndex]);
    } catch (error) {
      logger.error('Erro ao atualizar tarefa:', error);
      return res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
  });

  /**
   * DELETE /api/tasks/:id
   * Remove uma tarefa do cache local
   */
  app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      const taskIndex = tasksCache.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Tarefa não encontrada' });
      }

      tasksCache.splice(taskIndex, 1);
      lastCacheUpdate = new Date();

      logger.info(`✅ Tarefa removida: ${taskId}`);
      return res.json({ success: true, message: 'Tarefa removida' });
    } catch (error) {
      logger.error('Erro ao remover tarefa:', error);
      return res.status(500).json({ error: 'Erro ao remover tarefa' });
    }
  });

  /**
   * POST /api/tasks/sync
   * Sincroniza tarefas do Google Sheets para o cache local
   */
  app.post('/api/tasks/sync', async (req: Request, res: Response) => {
    try {
      const { tasks } = req.body;
      
      if (Array.isArray(tasks)) {
        tasksCache = tasks;
        lastCacheUpdate = new Date();
        logger.info(`✅ Cache de tarefas sincronizado: ${tasks.length} tarefas`);
      }

      res.json({ 
        success: true, 
        count: tasksCache.length,
        lastUpdate: lastCacheUpdate
      });
    } catch (error) {
      logger.error('Erro ao sincronizar tarefas:', error);
      res.status(500).json({ error: 'Erro ao sincronizar tarefas' });
    }
  });

  /**
   * GET /api/tasks/users
   * Lista usuários para atribuição de tarefas
   */
  app.get('/api/tasks/users', async (req: Request, res: Response) => {
    try {
      // Retorna lista vazia - frontend deve buscar de /api/users
      res.json([]);
    } catch (error) {
      logger.error('Erro ao buscar usuários para tarefas:', error);
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  });

  logger.info('📋 Rotas de tarefas registradas');
}

export default taskRoutes;
