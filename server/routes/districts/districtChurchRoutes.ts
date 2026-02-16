/**
 * District Church Routes
 * Church-district association management and district data cleanup
 *
 * Routes:
 *   GET    /api/districts/:id/churches            - List churches of a district
 *   GET    /api/churches/unassigned                - List unassigned churches (superadmin)
 *   POST   /api/districts/:id/churches             - Link church to district (superadmin)
 *   POST   /api/districts/:id/churches/bulk        - Bulk link churches (superadmin)
 *   DELETE /api/districts/:id/churches/:churchId   - Unlink church from district (superadmin)
 *   DELETE /api/districts/:id/data                 - Clear district data (pastor/superadmin)
 */

import { type Express, type Request, type Response } from 'express';
import { sql } from '../../neonConfig';
import { getRepository } from '../../container';
import { isSuperAdmin, isPastor } from '../../utils/permissions';
import { logger } from '../../utils/logger';
import { invalidateCacheMiddleware } from '../../middleware/cache';
import {
  sendSuccess,
  sendNotFound,
  sendForbidden,
  sendValidationError,
  sendInternalError,
} from '../../utils/apiResponse';
import { getAuthUserId } from '../../utils/authHelpers';

export const districtChurchRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const churchRepo = getRepository('churchRepository');

  // Listar igrejas de um distrito
  app.get('/api/districts/:id/churches', async (req: Request, res: Response) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      // Verificar permissão - superadmin tem acesso a tudo, pastor apenas ao seu distrito
      if (!isSuperAdmin(user) && !(isPastor(user) && user?.districtId === districtId)) {
        return sendForbidden(res, 'Acesso negado');
      }

      const churches = await churchRepo.getChurchesByDistrict(districtId);
      return sendSuccess(res, churches);
    } catch (error) {
      logger.error('Erro ao buscar igrejas do distrito:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });

  // Listar igrejas sem distrito (apenas superadmin)
  app.get('/api/churches/unassigned', async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user)) {
        return sendForbidden(res, 'Apenas superadmin pode ver igrejas sem distrito');
      }

      const churches = await sql`
        SELECT * FROM churches 
        WHERE district_id IS NULL 
        ORDER BY name
      `;

      return sendSuccess(res, churches);
    } catch (error) {
      logger.error('Erro ao buscar igrejas sem distrito:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });

  // Vincular igreja a um distrito (apenas superadmin)
  app.post('/api/districts/:id/churches', async (req: Request, res: Response) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user)) {
        return res
          .status(403)
          .json({ error: 'Apenas superadmin pode vincular igrejas a distritos' });
      }

      const { churchId } = req.body;

      if (!churchId) {
        return sendValidationError(res, { message: 'ID da igreja é obrigatório' });
      }

      // Verificar se distrito existe
      const district = await sql`
        SELECT id FROM districts WHERE id = ${districtId}
      `;
      if (district.length === 0) {
        return sendNotFound(res, 'Distrito não encontrado');
      }

      // Verificar se igreja existe
      const church = await sql`
        SELECT id, name FROM churches WHERE id = ${churchId}
      `;
      if (church.length === 0) {
        return sendNotFound(res, 'Igreja não encontrada');
      }

      // Vincular igreja ao distrito
      await sql`
        UPDATE churches
        SET district_id = ${districtId}, updated_at = NOW()
        WHERE id = ${churchId}
      `;

      return sendSuccess(res, {
        success: true,
        message: `Igreja "${church[0].name}" vinculada ao distrito com sucesso`,
      });
    } catch (error) {
      logger.error('Erro ao vincular igreja ao distrito:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });

  // Vincular múltiplas igrejas a um distrito (apenas superadmin)
  app.post('/api/districts/:id/churches/bulk', async (req: Request, res: Response) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user)) {
        return res
          .status(403)
          .json({ error: 'Apenas superadmin pode vincular igrejas a distritos' });
      }

      const { churchIds } = req.body;

      if (!churchIds || !Array.isArray(churchIds) || churchIds.length === 0) {
        return sendValidationError(res, { message: 'IDs das igrejas são obrigatórios' });
      }

      // Verificar se distrito existe
      const district = await sql`
        SELECT id FROM districts WHERE id = ${districtId}
      `;
      if (district.length === 0) {
        return sendNotFound(res, 'Distrito não encontrado');
      }

      // Vincular igrejas ao distrito
      let successCount = 0;
      for (const churchId of churchIds) {
        try {
          await sql`
            UPDATE churches
            SET district_id = ${districtId}, updated_at = NOW()
            WHERE id = ${churchId}
          `;
          successCount++;
        } catch (e) {
          logger.error(`Erro ao vincular igreja ${churchId}:`, e);
        }
      }

      return sendSuccess(res, {
        success: true,
        message: `${successCount} igreja(s) vinculada(s) ao distrito com sucesso`,
        count: successCount,
      });
    } catch (error) {
      logger.error('Erro ao vincular igrejas ao distrito:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });

  // Desvincular igreja de um distrito (apenas superadmin)
  app.delete('/api/districts/:id/churches/:churchId', async (req: Request, res: Response) => {
    try {
      const districtId = parseInt(req.params.id);
      const churchId = parseInt(req.params.churchId);
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user)) {
        return res
          .status(403)
          .json({ error: 'Apenas superadmin pode desvincular igrejas de distritos' });
      }

      // Verificar se igreja pertence ao distrito
      const church = await sql`
        SELECT id, name FROM churches WHERE id = ${churchId} AND district_id = ${districtId}
      `;
      if (church.length === 0) {
        return sendNotFound(res, 'Igreja não encontrada neste distrito');
      }

      // Desvincular igreja
      await sql`
        UPDATE churches
        SET district_id = NULL, updated_at = NOW()
        WHERE id = ${churchId}
      `;

      return sendSuccess(res, {
        success: true,
        message: `Igreja "${church[0].name}" desvinculada do distrito com sucesso`,
      });
    } catch (error) {
      logger.error('Erro ao desvincular igreja do distrito:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });

  // Limpar dados (membros) de um distrito - apenas pastor do distrito ou superadmin
  app.delete(
    '/api/districts/:id/data',
    invalidateCacheMiddleware('users'),
    async (req: Request, res: Response) => {
      try {
        const districtId = parseInt(req.params.id);
        const userId = getAuthUserId(req);
        const user = userId ? await userRepo.getUserById(userId) : null;

        // Verificar se o distrito existe
        const district = await sql`SELECT id, name FROM districts WHERE id = ${districtId}`;
        if (district.length === 0) {
          return sendNotFound(res, 'Distrito não encontrado');
        }

        // Verificar permissão: superadmin pode limpar qualquer distrito, pastor apenas o seu
        if (!isSuperAdmin(user) && !(isPastor(user) && user?.districtId === districtId)) {
          return sendForbidden(res, 'Sem permissão para limpar dados deste distrito');
        }

        // Buscar igrejas do distrito
        const churches = await sql<{ id: number }>`
          SELECT id FROM churches WHERE district_id = ${districtId}
        `;
        const churchIds = churches.map(c => c.id);

        if (churchIds.length === 0) {
          return sendSuccess(res, {
            success: true,
            message: 'Nenhuma igreja encontrada no distrito. Nenhum dado para limpar.',
            deleted: { users: 0, relationships: 0, events: 0 },
          });
        }

        let deletedUsers = 0;
        let deletedRelationships = 0;
        let deletedEvents = 0;

        // 1. Deletar relacionamentos de membros das igrejas do distrito
        const relResult = await sql`
          DELETE FROM relationships
          WHERE missionary_id IN (
            SELECT id FROM users WHERE church_id = ANY(${churchIds})
          ) OR interested_id IN (
            SELECT id FROM users WHERE church_id = ANY(${churchIds})
          )
        `;
        deletedRelationships = (relResult as { count?: number }).count || 0;

        // 2. Deletar solicitações de discipulado
        await sql`
          DELETE FROM discipleship_requests
          WHERE missionary_id IN (
            SELECT id FROM users WHERE church_id = ANY(${churchIds})
          ) OR interested_id IN (
            SELECT id FROM users WHERE church_id = ANY(${churchIds})
          )
        `;

        // 3. Deletar eventos das igrejas
        const eventResult = await sql`
          DELETE FROM events
          WHERE church_id = ANY(${churchIds})
        `;
        deletedEvents = (eventResult as { count?: number }).count || 0;

        // 4. Deletar tarefas das igrejas/membros
        await sql`
          DELETE FROM tasks
          WHERE created_by IN (
            SELECT id FROM users WHERE church_id = ANY(${churchIds})
          ) OR assigned_to IN (
            SELECT id FROM users WHERE church_id = ANY(${churchIds})
          )
        `;

        // 5. Deletar orações
        await sql`
          DELETE FROM prayer_requests
          WHERE user_id IN (
            SELECT id FROM users WHERE church_id = ANY(${churchIds})
          )
        `;

        // 6. Deletar mensagens
        await sql`
          DELETE FROM messages
          WHERE sender_id IN (
            SELECT id FROM users WHERE church_id = ANY(${churchIds})
          ) OR receiver_id IN (
            SELECT id FROM users WHERE church_id = ANY(${churchIds})
          )
        `;

        // 7. Deletar notificações
        await sql`
          DELETE FROM notifications
          WHERE user_id IN (
            SELECT id FROM users WHERE church_id = ANY(${churchIds})
          )
        `;

        // 8. Deletar usuários (exceto pastores e admins)
        const userResult = await sql`
          DELETE FROM users
          WHERE church_id = ANY(${churchIds})
            AND role NOT IN ('superadmin', 'pastor', 'admin')
            AND id <> ${userId}
        `;
        deletedUsers = (userResult as { count?: number }).count || 0;

        logger.info(`Dados do distrito ${districtId} limpos por usuário ${userId}:`, {
          deletedUsers,
          deletedRelationships,
          deletedEvents,
        });

        return sendSuccess(res, {
          success: true,
          message: `Dados do distrito "${district[0].name}" limpos com sucesso`,
          deleted: {
            users: deletedUsers,
            relationships: deletedRelationships,
            events: deletedEvents,
          },
        });
      } catch (error) {
        logger.error('Erro ao limpar dados do distrito:', error);
        return sendInternalError(res, 'Erro ao limpar dados do distrito');
      }
    }
  );
};
