/**
 * Church Routes Module
 * Endpoints relacionados ao gerenciamento de igrejas
 */

import { Express, Request, Response } from 'express';
import { getRepository } from '../container';
import { isSuperAdmin, isPastor } from '../utils/permissions';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createChurchSchema, updateChurchSchema } from '../schemas';
import { logger } from '../utils/logger';
import { Church } from '../../shared/schema';
import { cacheMiddleware, invalidateCacheMiddleware } from '../middleware/cache';
import { CACHE_TTL } from '../constants';
import { asyncHandler } from '../utils';
import { sendSuccess, sendError, sendNotFound } from '../utils/apiResponse';

export const churchRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const churchRepo = getRepository('churchRepository');

  /**
   * @swagger
   * /api/churches:
   *   get:
   *     summary: Lista todas as igrejas
   *     tags: [Churches]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Lista de igrejas
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Church'
   */
  app.get(
    '/api/churches',
    cacheMiddleware('churches', CACHE_TTL.CHURCHES),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = parseInt((req.headers['x-user-id'] as string) || '0');
      const user = userId ? await userRepo.getUserById(userId) : null;

      let churches: Church[];
      if (isSuperAdmin(user)) {
        // Superadmin sempre vê todas as igrejas
        churches = await churchRepo.getAllChurches();
      } else if (isPastor(user) && user?.districtId) {
        // Pastor vê apenas igrejas do seu distrito
        churches = await churchRepo.getChurchesByDistrict(user.districtId);
      } else {
        // Outros usuários veem apenas sua igreja
        const userChurch = user?.church;
        if (userChurch) {
          churches = await churchRepo
            .getAllChurches()
            .then(chs => chs.filter(ch => ch.name === userChurch));
        } else {
          churches = [];
        }
      }

      sendSuccess(res, churches);
    })
  );

  /**
   * @swagger
   * /api/churches:
   *   post:
   *     summary: Cria nova igreja
   *     tags: [Churches]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *               address:
   *                 type: string
   *     responses:
   *       200:
   *         description: Igreja criada
   *       400:
   *         description: Nome obrigatório
   */
  app.post(
    '/api/churches',
    validateBody(createChurchSchema),
    invalidateCacheMiddleware('churches'),
    asyncHandler(async (req: Request, res: Response) => {
      const { name } = (req as ValidatedRequest<typeof createChurchSchema._type>).validatedBody;
      logger.info(`Creating church: ${name}`);

      const church = await churchRepo.getOrCreateChurch(name.trim());

      sendSuccess(res, church);
    })
  );

  /**
   * @swagger
   * /api/churches/{id}:
   *   patch:
   *     summary: Atualiza igreja
   *     tags: [Churches]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               address:
   *                 type: string
   *     responses:
   *       200:
   *         description: Igreja atualizada
   *       404:
   *         description: Igreja não encontrada
   */
  app.patch(
    '/api/churches/:id',
    validateBody(updateChurchSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const updates = (req as ValidatedRequest<typeof updateChurchSchema._type>).validatedBody;

      const oldChurch = await churchRepo
        .getAllChurches()
        .then(churches => churches.find(c => c.id === id));

      const updatedChurch = await churchRepo.updateChurch(id, updates);
      if (updatedChurch) {
        if (updates.name && oldChurch && oldChurch.name !== updates.name) {
          const allUsers = await userRepo.getAllUsers();

          for (const user of allUsers) {
            if (user.church === oldChurch.name) {
              try {
                await userRepo.updateUser(user.id, { church: updates.name });
              } catch (error) {
                logger.error(`Erro ao atualizar usuário ${user.name}:`, error);
              }
            }
          }
        }

        sendSuccess(res, updatedChurch);
      } else {
        sendNotFound(res, 'Igreja');
      }
    })
  );

  /**
   * @swagger
   * /api/user/church:
   *   get:
   *     summary: Obtém igreja do usuário
   *     tags: [Churches, Users]
   *     parameters:
   *       - in: query
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Igreja do usuário
   *       400:
   *         description: ID do usuário obrigatório
   *       404:
   *         description: Usuário não encontrado
   */
  app.get(
    '/api/user/church',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.query.userId;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const id = parseInt(userId as string);
      if (isNaN(id)) {
        return sendError(res, 'Invalid user ID', 400);
      }

      const user = await userRepo.getUserById(id);

      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      let churchName = user.church;
      if (!churchName) {
        const churches = await churchRepo.getAllChurches();
        if (churches.length > 0) {
          churchName = churches[0].name;
          try {
            await userRepo.updateUserChurch(id, churchName || '');
          } catch (updateError) {
            logger.error('Error updating user church:', updateError);
          }
        }
      }

      sendSuccess(res, {
        success: true,
        church: churchName || 'Igreja não disponível',
        userId: id,
      });
    })
  );
};
