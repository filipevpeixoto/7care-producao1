/**
 * Prayer Routes Module
 * Endpoints relacionados a pedidos de oração
 */

import { type Express, type Request, type Response } from 'express';
import { getRepository } from '../container';
import { logger } from '../utils/logger';
import { validateBody, type ValidatedRequest } from '../middleware/validation';
import { createPrayerSchema } from '../schemas';
import { asyncHandler, sendSuccess, sendError, sendNotFound } from '../utils';
import { isPastor } from '../utils/permissions';
import { getAuthUserId } from '../utils/authHelpers';

export const prayerRoutes = (app: Express): void => {
  const prayerRepo = getRepository('prayerRepository');
  const userRepo = getRepository('userRepository');

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

      // Obter usuário logado para filtro por distrito
      const requestingUserId = getAuthUserId(req);
      let requestingUser = null;
      if (requestingUserId) {
        requestingUser = await userRepo.getUserById(requestingUserId);
      }

      let prayers;

      // Usar filtro DB-level por distrito se for pastor (não superadmin)
      if (requestingUser && isPastor(requestingUser) && requestingUser.districtId) {
        logger.info(`🙏 Buscando orações por distrito (DB-level): ${requestingUser.districtId}`);
        prayers = await prayerRepo.getByDistrict(requestingUser.districtId);
      } else {
        prayers = await prayerRepo.getAll();
      }

      // Só filtrar por userId se NÃO for admin/pastor (eles veem todas do escopo)
      if (userId && requestingUser && !isPastor(requestingUser) && requestingUser.role !== 'superadmin') {
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

      // Enriquecer com dados do usuário (nome, igreja, foto)
      const enrichedPrayers = await Promise.all(
        prayers.map(async (prayer: any) => {
          const prayerUserId = Number(prayer.userId);
          let requesterName = 'Usuário';
          let requesterChurch = '';
          let requesterPhoto = null;
          if (prayerUserId) {
            const requester = await userRepo.getUserById(prayerUserId);
            if (requester) {
              requesterName = requester.name || 'Usuário';
              requesterChurch = requester.church || '';
              requesterPhoto = requester.profilePhoto || null;
            }
          }
          return {
            ...prayer,
            requesterName,
            requesterChurch,
            requesterPhoto,
          };
        })
      );

      sendSuccess(res, enrichedPrayers);
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

      // Obter districtId do usuário criador
      const creatorUser = prayerData.userId ? await userRepo.getUserById(prayerData.userId) : null;
      const districtId = creatorUser?.districtId ?? null;

      const prayer = await prayerRepo.create({
        ...prayerData,
        description: prayerData.description ?? null,
        districtId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
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

      const prayer = await prayerRepo.markAsAnswered(id, testimony);

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
      const userId = getAuthUserId(req);
      const prayer = await prayerRepo.getById(id);

      if (!prayer) {
        return sendNotFound(res, 'Pedido de oração');
      }

      // Verificar se é o dono ou admin
      const user = userId ? await userRepo.getUserById(userId) : null;
      if (prayer.userId !== userId && user?.role !== 'superadmin' && user?.role !== 'pastor') {
        return sendError(res, 'Sem permissão para remover este pedido', 403);
      }

      await prayerRepo.delete(id);
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

      const result = await prayerRepo.addIntercessor(prayerId, intercessorId);
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

      await prayerRepo.removeIntercessor(prayerId, intercessorId);
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
      const intercessors = await prayerRepo.getIntercessors(prayerId);
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
      const prayers = await prayerRepo.getPrayersUserIsPrayingFor(userId);
      sendSuccess(res, prayers);
    })
  );
};
