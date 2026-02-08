/**
 * Task Routes
 * Rotas para gerenciamento de tarefas
 * Tarefas salvas no banco de dados, isoladas por pastor/distrito
 */

import { Express, Request, Response } from 'express';
import { sql } from '../neonConfig';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils';
import { validateBody, validateParams, ValidatedRequest } from '../middleware/validation';
import { createTaskSchema, updateTaskSchema, idParamSchema } from '../schemas';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/apiResponse';

/**
 * Registra as rotas de tarefas
 */
export function taskRoutes(app: Express): void {
  /**
   * GET /api/tasks
   * Lista tarefas filtradas por distrito do pastor (isolamento por pastor)
   * - Superadmin: vê todas as tarefas
   * - Pastor: vê apenas tarefas do seu distrito
   * - Membro: vê apenas tarefas do seu distrito
   */
  app.get(
    '/api/tasks',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = parseInt((req.headers['x-user-id'] as string) || '0');

      if (!userId) {
        return sendSuccess(res, { tasks: [] });
      }

      // Buscar dados do usuário (role e districtId)
      const userResult = await sql`
        SELECT id, role, district_id, church FROM users WHERE id = ${userId}
      `;

      if (userResult.length === 0) {
        return sendSuccess(res, { tasks: [] });
      }

      const currentUser = userResult[0];
      let tasks;

      if (currentUser.role === 'superadmin') {
        // Superadmin vê todas as tarefas
        tasks = await sql`
          SELECT 
            t.*,
            u1.name as created_by_name,
            u2.name as assigned_to_name
          FROM tasks t
          LEFT JOIN users u1 ON t.created_by_id = u1.id
          LEFT JOIN users u2 ON t.assigned_to_id = u2.id
          ORDER BY t.created_at DESC
        `;
      } else if (currentUser.district_id) {
        // Pastor/membro: apenas tarefas do seu distrito
        tasks = await sql`
          SELECT 
            t.*,
            u1.name as created_by_name,
            u2.name as assigned_to_name
          FROM tasks t
          LEFT JOIN users u1 ON t.created_by_id = u1.id
          LEFT JOIN users u2 ON t.assigned_to_id = u2.id
          WHERE t.district_id = ${currentUser.district_id}
          ORDER BY t.created_at DESC
        `;
      } else {
        // Sem distrito: apenas tarefas criadas pelo próprio
        tasks = await sql`
          SELECT 
            t.*,
            u1.name as created_by_name,
            u2.name as assigned_to_name
          FROM tasks t
          LEFT JOIN users u1 ON t.created_by_id = u1.id
          LEFT JOIN users u2 ON t.assigned_to_id = u2.id
          WHERE t.created_by_id = ${userId}
          ORDER BY t.created_at DESC
        `;
      }

      // Formatar resposta
      const formattedTasks = tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority,
        due_date: t.due_date || null,
        created_by: t.created_by_id,
        assigned_to: t.assigned_to_id,
        created_by_name: t.created_by_name || '',
        assigned_to_name: t.assigned_to_name || '',
        church: t.church || '',
        district_id: t.district_id,
        tags: t.tags || [],
        completed_at: t.completed_at || null,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));

      logger.info(`📋 GET /api/tasks - ${formattedTasks.length} tarefas para user ${userId}`);
      sendSuccess(res, { tasks: formattedTasks });
    })
  );

  /**
   * POST /api/tasks
   * Cria uma nova tarefa no banco de dados
   * Automaticamente associa ao distrito do pastor
   */
  app.post(
    '/api/tasks',
    validateBody(createTaskSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const validatedReq = req as ValidatedRequest<typeof createTaskSchema._type>;
      const { title, description, priority, status, dueDate, assignedToId, church } =
        validatedReq.validatedBody;

      const userId = parseInt((req.headers['x-user-id'] as string) || '0');

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar distrito do usuário para isolamento
      const userResult = await sql`
        SELECT id, district_id, church FROM users WHERE id = ${userId}
      `;

      if (userResult.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const currentUser = userResult[0];
      const districtId = currentUser.district_id || null;
      const taskChurch = church || currentUser.church || '';

      const result = await sql`
        INSERT INTO tasks (title, description, status, priority, due_date, created_by_id, assigned_to_id, district_id, church, tags)
        VALUES (
          ${title},
          ${description || ''},
          ${status || 'pending'},
          ${priority || 'medium'},
          ${dueDate || null},
          ${userId},
          ${assignedToId || null},
          ${districtId},
          ${taskChurch},
          '[]'::jsonb
        )
        RETURNING *
      `;

      const task = result[0];

      // Buscar nomes do criador e responsável
      let createdByName = '';
      let assignedToName = '';

      const creatorResult = await sql`SELECT name FROM users WHERE id = ${userId}`;
      if (creatorResult.length > 0) createdByName = creatorResult[0].name;

      if (assignedToId) {
        const assigneeResult = await sql`SELECT name FROM users WHERE id = ${assignedToId}`;
        if (assigneeResult.length > 0) assignedToName = assigneeResult[0].name;
      }

      const formattedTask = {
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || null,
        created_by: task.created_by_id,
        assigned_to: task.assigned_to_id,
        created_by_name: createdByName,
        assigned_to_name: assignedToName,
        church: task.church || '',
        district_id: task.district_id,
        tags: task.tags || [],
        completed_at: task.completed_at || null,
        created_at: task.created_at,
        updated_at: task.updated_at,
      };

      logger.info(`✅ Tarefa criada: ${task.id} - "${title}" (distrito: ${districtId})`);
      sendCreated(res, formattedTask);
    })
  );

  /**
   * PUT /api/tasks/:id
   * Atualiza uma tarefa (somente se o usuário tem acesso pelo distrito)
   */
  app.put(
    '/api/tasks/:id',
    validateParams(idParamSchema),
    validateBody(updateTaskSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const validatedReq = req as ValidatedRequest<typeof idParamSchema._type>;
      const taskId = validatedReq.validatedParams.id;
      const userId = parseInt((req.headers['x-user-id'] as string) || '0');

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se a tarefa existe
      const taskResult = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
      if (taskResult.length === 0) {
        return sendNotFound(res, 'Tarefa não encontrada');
      }

      const existingTask = taskResult[0];

      // Verificar acesso ao distrito
      const userResult = await sql`SELECT id, role, district_id FROM users WHERE id = ${userId}`;
      if (userResult.length === 0) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      const currentUser = userResult[0];

      // Verificar permissão: superadmin pode editar qualquer tarefa,
      // outros só podem editar tarefas do seu distrito
      if (
        currentUser.role !== 'superadmin' &&
        existingTask.district_id !== currentUser.district_id
      ) {
        return res.status(403).json({ error: 'Sem permissão para editar esta tarefa' });
      }

      const updates = req.body;
      const completedAt =
        updates.status === 'completed' && existingTask.status !== 'completed'
          ? new Date().toISOString()
          : updates.status !== 'completed'
            ? null
            : existingTask.completed_at;

      const result = await sql`
        UPDATE tasks SET
          title = COALESCE(${updates.title || null}, title),
          description = COALESCE(${updates.description !== undefined ? updates.description : null}, description),
          status = COALESCE(${updates.status || null}, status),
          priority = COALESCE(${updates.priority || null}, priority),
          due_date = ${updates.dueDate !== undefined ? updates.dueDate || null : existingTask.due_date},
          assigned_to_id = ${updates.assignedToId !== undefined ? updates.assignedToId || null : existingTask.assigned_to_id},
          church = COALESCE(${updates.church !== undefined ? updates.church : null}, church),
          completed_at = ${completedAt},
          updated_at = NOW()
        WHERE id = ${taskId}
        RETURNING *
      `;

      if (result.length === 0) {
        return sendNotFound(res, 'Tarefa não encontrada');
      }

      const task = result[0];

      // Buscar nomes
      let createdByName = '';
      let assignedToName = '';

      const creatorResult = await sql`SELECT name FROM users WHERE id = ${task.created_by_id}`;
      if (creatorResult.length > 0) createdByName = creatorResult[0].name;

      if (task.assigned_to_id) {
        const assigneeResult = await sql`SELECT name FROM users WHERE id = ${task.assigned_to_id}`;
        if (assigneeResult.length > 0) assignedToName = assigneeResult[0].name;
      }

      const formattedTask = {
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || null,
        created_by: task.created_by_id,
        assigned_to: task.assigned_to_id,
        created_by_name: createdByName,
        assigned_to_name: assignedToName,
        church: task.church || '',
        district_id: task.district_id,
        tags: task.tags || [],
        completed_at: task.completed_at || null,
        created_at: task.created_at,
        updated_at: task.updated_at,
      };

      logger.info(`✅ Tarefa atualizada: ${taskId}`);
      sendSuccess(res, formattedTask);
    })
  );

  /**
   * DELETE /api/tasks/:id
   * Remove uma tarefa (somente se o usuário tem acesso pelo distrito)
   */
  app.delete(
    '/api/tasks/:id',
    validateParams(idParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const validatedReq = req as ValidatedRequest<typeof idParamSchema._type>;
      const taskId = validatedReq.validatedParams.id;
      const userId = parseInt((req.headers['x-user-id'] as string) || '0');

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se a tarefa existe
      const taskResult = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
      if (taskResult.length === 0) {
        return sendNotFound(res, 'Tarefa não encontrada');
      }

      const existingTask = taskResult[0];

      // Verificar acesso ao distrito
      const userResult = await sql`SELECT id, role, district_id FROM users WHERE id = ${userId}`;
      if (userResult.length === 0) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      const currentUser = userResult[0];

      // Verificar permissão
      if (
        currentUser.role !== 'superadmin' &&
        existingTask.district_id !== currentUser.district_id
      ) {
        return res.status(403).json({ error: 'Sem permissão para deletar esta tarefa' });
      }

      await sql`DELETE FROM tasks WHERE id = ${taskId}`;

      logger.info(`✅ Tarefa removida: ${taskId}`);
      sendSuccess(res, { message: 'Tarefa removida' });
    })
  );

  /**
   * GET /api/tasks/users
   * Lista usuários do distrito do pastor para atribuição de tarefas
   */
  app.get(
    '/api/tasks/users',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = parseInt((req.headers['x-user-id'] as string) || '0');

      if (!userId) {
        return sendSuccess(res, { users: [] });
      }

      // Buscar dados do usuário
      const userResult = await sql`
        SELECT id, role, district_id FROM users WHERE id = ${userId}
      `;

      if (userResult.length === 0) {
        return sendSuccess(res, { users: [] });
      }

      const currentUser = userResult[0];
      let users;

      if (currentUser.role === 'superadmin') {
        // Superadmin vê todos os usuários
        users = await sql`
          SELECT id, name, email, role, church
          FROM users
          WHERE status = 'active' OR status IS NULL
          ORDER BY name ASC
          LIMIT 500
        `;
      } else if (currentUser.district_id) {
        // Pastor/membro: apenas usuários do seu distrito
        users = await sql`
          SELECT id, name, email, role, church
          FROM users
          WHERE district_id = ${currentUser.district_id}
            AND (status = 'active' OR status IS NULL)
          ORDER BY name ASC
          LIMIT 500
        `;
      } else {
        users = [];
      }

      sendSuccess(res, { users });
    })
  );

  logger.info('📋 Rotas de tarefas registradas (banco de dados)');
}

export default taskRoutes;
