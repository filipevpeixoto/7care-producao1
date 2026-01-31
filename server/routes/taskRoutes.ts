/**
 * Task Routes
 * Rotas para gerenciamento de tarefas
 * Nota: As tarefas principais são gerenciadas via Google Sheets,
 * esta rota serve como fallback/cache local
 */

import { Express, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { asyncHandler, sendSuccess, sendError, sendNotFound } from '../utils';

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
  app.get(
    '/api/tasks',
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('📋 GET /api/tasks - Retornando cache de tarefas');

      res.json({
        tasks: tasksCache,
        source: 'local-cache',
        lastUpdate: lastCacheUpdate,
        note: 'Para dados atualizados, use Google Sheets via /api/google-sheets/proxy',
      });
    })
  );

  /**
   * POST /api/tasks
   * Cria uma nova tarefa no cache local
   */
  app.post(
    '/api/tasks',
    asyncHandler(async (req: Request, res: Response) => {
      const { title, description, priority, due_date, assigned_to, church, tags } = req.body;

      if (!title) {
        return sendError(res, 'Título é obrigatório', 400);
      }

      const userId = parseInt((req.headers['x-user-id'] as string) || '0');

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
        tags: tags || [],
      };

      tasksCache.push(newTask);
      lastCacheUpdate = new Date();

      logger.info(`✅ Tarefa criada localmente: ${newTask.id}`);
      res.status(201).json(newTask);
    })
  );

  /**
   * PUT /api/tasks/:id
   * Atualiza uma tarefa no cache local
   */
  app.put(
    '/api/tasks/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const taskId = parseInt(req.params.id);
      const taskIndex = tasksCache.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        return sendNotFound(res, 'Tarefa não encontrada');
      }

      const updates = req.body;
      tasksCache[taskIndex] = {
        ...tasksCache[taskIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      lastCacheUpdate = new Date();

      logger.info(`✅ Tarefa atualizada: ${taskId}`);
      res.json(tasksCache[taskIndex]);
    })
  );

  /**
   * DELETE /api/tasks/:id
   * Remove uma tarefa do cache local
   */
  app.delete(
    '/api/tasks/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const taskId = parseInt(req.params.id);
      const taskIndex = tasksCache.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        return sendNotFound(res, 'Tarefa não encontrada');
      }

      tasksCache.splice(taskIndex, 1);
      lastCacheUpdate = new Date();

      logger.info(`✅ Tarefa removida: ${taskId}`);
      sendSuccess(res, { message: 'Tarefa removida' });
    })
  );

  /**
   * POST /api/tasks/sync
   * Sincroniza tarefas do Google Sheets para o cache local
   */
  app.post(
    '/api/tasks/sync',
    asyncHandler(async (req: Request, res: Response) => {
      const { tasks } = req.body;

      if (Array.isArray(tasks)) {
        tasksCache = tasks;
        lastCacheUpdate = new Date();
        logger.info(`✅ Cache de tarefas sincronizado: ${tasks.length} tarefas`);
      }

      sendSuccess(res, {
        count: tasksCache.length,
        lastUpdate: lastCacheUpdate,
      });
    })
  );

  /**
   * GET /api/tasks/users
   * Lista usuários para atribuição de tarefas
   */
  app.get(
    '/api/tasks/users',
    asyncHandler(async (req: Request, res: Response) => {
      // Retorna lista vazia - frontend deve buscar de /api/users
      res.json([]);
    })
  );

  logger.info('📋 Rotas de tarefas registradas');
}

export default taskRoutes;
