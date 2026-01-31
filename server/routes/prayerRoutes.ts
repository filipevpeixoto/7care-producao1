/**
 * Prayer Routes Module
 * Endpoints relacionados a pedidos de oração
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createPrayerSchema } from '../schemas';
import { asyncHandler, sendSuccess, sendError, sendNotFound } from '../utils';

export const prayerRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

  /**
   * @swagger
   * /api/prayers:
   *   get:
   *     summary: Lista pedidos de oração
   *     tags: [Prayers]
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *         description: Filtrar por usuário
   *       - in: query
   *         name: isPublic
   *         schema:
   *           type: boolean
   *         description: Filtrar por visibilidade
   *       - in: query
   *         name: isAnswered
   *         schema:
   *           type: boolean
   *         description: Filtrar por respondidos
   *     responses:
   *       200:
   *         description: Lista de pedidos de oração
   */
  app.get(
    '/api/prayers',
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, isPublic, isAnswered } = req.query;
      let prayers = await storage.getAllPrayers();

      if (userId) {
        const id = parseInt(userId as string);
        prayers = prayers.filter((p: { userId?: number }) => p.userId === id);
      }

      if (isPublic !== undefined) {
        const publicFilter = isPublic === 'true';
        prayers = prayers.filter((p: { isPublic?: boolean }) => p.isPublic === publicFilter);
      }

      if (isAnswered !== undefined) {
        const answeredFilter = isAnswered === 'true';
        prayers = prayers.filter((p: { isAnswered?: boolean }) => p.isAnswered === answeredFilter);
      }

      sendSuccess(res, prayers);
    })
  );

  /**
   * @swagger
   * /api/prayers:
   *   post:
   *     summary: Cria pedido de oração
   *     tags: [Prayers]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - title
   *             properties:
   *               userId:
   *                 type: integer
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               isPublic:
   *                 type: boolean
   *                 default: true
   *               allowIntercessors:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       201:
   *         description: Pedido criado
   */
  app.post(
    '/api/prayers',
    validateBody(createPrayerSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const prayerData = (req as ValidatedRequest<typeof createPrayerSchema._type>).validatedBody;
      logger.info(`Creating prayer request: ${prayerData.title}`);
      const prayer = await storage.createPrayer({
        ...prayerData,
        description: prayerData.description ?? null,
      });
      sendSuccess(res, prayer, 201, 'Pedido de oração criado');
    })
  );

  /**
   * @swagger
   * /api/prayers/{id}/answer:
   *   post:
   *     summary: Marca pedido como respondido
   *     tags: [Prayers]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               testimony:
   *                 type: string
   *     responses:
   *       200:
   *         description: Pedido atualizado
   */
  app.post(
    '/api/prayers/:id/answer',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const { testimony } = req.body;

      const prayer = await storage.markPrayerAsAnswered(id, testimony);

      if (!prayer) {
        return sendNotFound(res, 'Pedido de oração');
      }

      sendSuccess(res, prayer, 200, 'Oração marcada como respondida');
    })
  );

  /**
   * @swagger
   * /api/prayers/{id}:
   *   delete:
   *     summary: Remove pedido de oração
   *     tags: [Prayers]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Pedido removido
   */
  app.delete(
    '/api/prayers/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);

      // Verificar permissão (apenas o criador ou admin pode remover)
      const userId = parseInt((req.headers['x-user-id'] as string) || '0');
      const prayer = await storage.getPrayerById(id);

      if (!prayer) {
        return sendNotFound(res, 'Pedido de oração');
      }

      // Verificar se é o dono ou admin
      const user = userId ? await storage.getUserById(userId) : null;
      if (prayer.userId !== userId && user?.role !== 'superadmin' && user?.role !== 'pastor') {
        return sendError(res, 'Sem permissão para remover este pedido', 403);
      }

      await storage.deletePrayer(id);
      sendSuccess(res, null, 200, 'Pedido removido');
    })
  );

  /**
   * @swagger
   * /api/prayers/{id}/intercessor:
   *   post:
   *     summary: Adiciona intercessor ao pedido
   *     tags: [Prayers]
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
   *             required:
   *               - intercessorId
   *             properties:
   *               intercessorId:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Intercessor adicionado
   */
  app.post(
    '/api/prayers/:id/intercessor',
    asyncHandler(async (req: Request, res: Response) => {
      const prayerId = parseInt(req.params.id);
      const { intercessorId } = req.body;

      if (!intercessorId) {
        return sendError(res, 'ID do intercessor é obrigatório', 400);
      }

      const result = await storage.addIntercessor(prayerId, intercessorId);
      sendSuccess(res, result, 201, 'Intercessor adicionado');
    })
  );

  /**
   * @swagger
   * /api/prayers/{id}/intercessor/{intercessorId}:
   *   delete:
   *     summary: Remove intercessor do pedido
   *     tags: [Prayers]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *       - in: path
   *         name: intercessorId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Intercessor removido
   */
  app.delete(
    '/api/prayers/:id/intercessor/:intercessorId',
    asyncHandler(async (req: Request, res: Response) => {
      const prayerId = parseInt(req.params.id);
      const intercessorId = parseInt(req.params.intercessorId);

      await storage.removeIntercessor(prayerId, intercessorId);
      sendSuccess(res, null, 200, 'Intercessor removido');
    })
  );

  /**
   * @swagger
   * /api/prayers/{id}/intercessors:
   *   get:
   *     summary: Lista intercessores do pedido
   *     tags: [Prayers]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Lista de intercessores
   */
  app.get(
    '/api/prayers/:id/intercessors',
    asyncHandler(async (req: Request, res: Response) => {
      const prayerId = parseInt(req.params.id);
      const intercessors = await storage.getIntercessorsByPrayer(prayerId);
      sendSuccess(res, intercessors);
    })
  );

  /**
   * @swagger
   * /api/prayers/user/{userId}/interceding:
   *   get:
   *     summary: Lista pedidos que o usuário está intercedendo
   *     tags: [Prayers]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Lista de pedidos
   */
  app.get(
    '/api/prayers/user/:userId/interceding',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = parseInt(req.params.userId);
      const prayers = await storage.getPrayersUserIsInterceding(userId);
      sendSuccess(res, prayers);
    })
  );
};
