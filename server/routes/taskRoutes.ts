/**
 * Task Routes
 * Rotas para gerenciamento de tarefas
 * Nota: As tarefas principais são gerenciadas via Google Sheets,
 * esta rota serve como fallback/cache local
 */

import { Express, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils';
import { validateBody, validateParams, ValidatedRequest } from '../middleware/validation';
import { createTaskSchema, updateTaskSchema, idParamSchema } from '../schemas';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/apiResponse';

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

      sendSuccess(res, {
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
    validateBody(createTaskSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const validatedReq = req as ValidatedRequest<typeof createTaskSchema._type>;
      const {
        title,
        description,
        priority,
        dueDate,
        assignedToId,
        relatedUserId: _relatedUserId,
      } = validatedReq.validatedBody;

      const userId = parseInt((req.headers['x-user-id'] as string) || '0');

      const newTask: Task = {
        id: Date.now(),
        title,
        description: description || '',
        status: 'pending',
        priority: priority || 'medium',
        due_date: dueDate || undefined,
        created_by: userId,
        assigned_to: assignedToId || undefined,
        church: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [],
      };

      tasksCache.push(newTask);
      lastCacheUpdate = new Date();

      logger.info(`✅ Tarefa criada localmente: ${newTask.id}`);
      sendCreated(res, newTask);
    })
  );

  /**
   * PUT /api/tasks/:id
   * Atualiza uma tarefa no cache local
   */
  app.put(
    '/api/tasks/:id',
    validateParams(idParamSchema),
    validateBody(updateTaskSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const validatedReq = req as ValidatedRequest<typeof idParamSchema._type>;
      const taskId = validatedReq.validatedParams.id;
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
      sendSuccess(res, tasksCache[taskIndex]);
    })
  );

  /**
   * DELETE /api/tasks/:id
   * Remove uma tarefa do cache local
   */
  app.delete(
    '/api/tasks/:id',
    validateParams(idParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const validatedReq = req as ValidatedRequest<typeof idParamSchema._type>;
      const taskId = validatedReq.validatedParams.id;
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
      sendSuccess(res, []);
    })
  );

  logger.info('📋 Rotas de tarefas registradas');
}

export default taskRoutes;
