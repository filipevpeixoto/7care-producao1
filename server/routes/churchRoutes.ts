/**
 * Church Routes Module
 * Endpoints relacionados ao gerenciamento de igrejas
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { handleError } from '../utils/errorHandler';
import { isSuperAdmin, isPastor } from '../utils/permissions';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createChurchSchema, updateChurchSchema } from '../schemas';
import { logger } from '../utils/logger';
import { Church } from '../../shared/schema';
import { cacheMiddleware, invalidateCacheMiddleware } from '../middleware/cache';
import { CACHE_TTL } from '../constants';

export const churchRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

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
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt((req.headers['x-user-id'] as string) || '0');
        const user = userId ? await storage.getUserById(userId) : null;

        let churches: Church[];
        if (isSuperAdmin(user)) {
          // Superadmin sempre vê todas as igrejas
          churches = await storage.getAllChurches();
        } else if (isPastor(user) && user?.districtId) {
          // Pastor vê apenas igrejas do seu distrito
          churches = await storage.getChurchesByDistrict(user.districtId);
        } else {
          // Outros usuários veem apenas sua igreja
          const userChurch = user?.church;
          if (userChurch) {
            churches = await storage
              .getAllChurches()
              .then(chs => chs.filter(ch => ch.name === userChurch));
          } else {
            churches = [];
          }
        }

        res.json(churches);
      } catch (error) {
        handleError(res, error, 'Get churches');
      }
    }
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
    async (req: Request, res: Response) => {
      try {
        const { name } = (req as ValidatedRequest<typeof createChurchSchema._type>).validatedBody;
        logger.info(`Creating church: ${name}`);

        const church = await storage.getOrCreateChurch(name.trim());

        res.json(church);
      } catch (error) {
        handleError(res, error, 'Create church');
      }
    }
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
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const updates = (req as ValidatedRequest<typeof updateChurchSchema._type>).validatedBody;

        const oldChurch = await storage
          .getAllChurches()
          .then(churches => churches.find(c => c.id === id));

        const updatedChurch = await storage.updateChurch(id, updates);
        if (updatedChurch) {
          if (updates.name && oldChurch && oldChurch.name !== updates.name) {
            const allUsers = await storage.getAllUsers();

            for (const user of allUsers) {
              if (user.church === oldChurch.name) {
                try {
                  await storage.updateUser(user.id, { church: updates.name });
                } catch (error) {
                  logger.error(`Erro ao atualizar usuário ${user.name}:`, error);
                }
              }
            }
          }

          res.json(updatedChurch);
        } else {
          res.status(404).json({ error: 'Igreja não encontrada' });
        }
      } catch (error) {
        handleError(res, error, 'Update church');
      }
    }
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
  app.get('/api/user/church', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const id = parseInt(userId as string);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      const user = await storage.getUserById(id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      let churchName = user.church;
      if (!churchName) {
        const churches = await storage.getAllChurches();
        if (churches.length > 0) {
          churchName = churches[0].name;
          try {
            await storage.updateUserChurch(id, churchName || '');
          } catch (updateError) {
            logger.error('Error updating user church:', updateError);
          }
        }
      }

      res.json({
        success: true,
        church: churchName || 'Igreja não disponível',
        userId: id,
      });
    } catch (error) {
      handleError(res, error, 'Get user church');
    }
  });
};
