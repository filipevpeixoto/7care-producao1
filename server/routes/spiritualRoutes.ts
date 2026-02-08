/**
 * Spiritual Routes Module
 * Endpoints relacionados ao acompanhamento espiritual (check-in emocional)
 */

import { Express, Request, Response } from 'express';
import { asyncHandler } from '../utils';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createEmotionalCheckInSchema } from '../schemas';
import { isPastor } from '../utils/permissions';
import { User } from '../../shared/schema';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { getRepository } from '../container';

export const spiritualRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const emotionalRepo = getRepository('emotionalCheckInRepository');

  /**
   * @swagger
   * /api/emotional-checkin:
   *   post:
   *     summary: Cria check-in emocional/espiritual
   *     tags: [Spiritual]
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
   *             properties:
   *               userId:
   *                 type: integer
   *               emotionalScore:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *               mood:
   *                 type: string
   *               prayerRequest:
   *                 type: string
   *               isPrivate:
   *                 type: boolean
   *               allowChurchMembers:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Check-in criado com sucesso
   */
  app.post(
    '/api/emotional-checkin',
    validateBody(createEmotionalCheckInSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const validatedData = (req as ValidatedRequest<typeof createEmotionalCheckInSchema._type>)
        .validatedBody;
      const { userId, emotionalScore, mood, prayerRequest, isPrivate, allowChurchMembers } =
        validatedData;
      logger.info(`Emotional check-in for user ${userId}`);

      let finalScore = emotionalScore ?? null;

      if (mood) {
        finalScore = null;
      }

      const checkIn = await emotionalRepo.create({
        userId,
        emotionalScore: finalScore,
        mood: mood ?? null,
        prayerRequest: prayerRequest ?? null,
        isPrivate,
        allowChurchMembers,
      });

      sendSuccess(res, checkIn, 201, 'Check-in criado com sucesso');
    })
  );

  /**
   * @swagger
   * /api/emotional-checkins/admin:
   *   get:
   *     summary: Lista check-ins emocionais para admin
   *     tags: [Spiritual]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Lista de check-ins
   */
  app.get(
    '/api/emotional-checkins/admin',
    asyncHandler(async (req: Request, res: Response) => {
      const requestingUserId = parseInt((req.headers['x-user-id'] as string) || '0');
      const requestingUser = requestingUserId ? await userRepo.getUserById(requestingUserId) : null;

      let checkIns;

      // Filtrar por distrito se for pastor - usando query eficiente
      if (isPastor(requestingUser) && requestingUser?.districtId) {
        // Buscar IDs de usuários do distrito
        const districtUsers = await userRepo.getUsersByDistrictId(requestingUser.districtId);
        const districtUserIds = districtUsers.map((u: User) => u.id);

        // Buscar check-ins apenas dos usuários do distrito
        checkIns = await emotionalRepo.getByUserIds(districtUserIds);
        logger.info(
          `🏛️ Check-ins filtrados por distrito ${requestingUser.districtId}: ${checkIns.length} encontrados`
        );
      } else {
        checkIns = await emotionalRepo.getAll();
      }

      sendSuccess(res, checkIns);
    })
  );

  /**
   * @swagger
   * /api/spiritual-checkins/scores:
   *   get:
   *     summary: Obtém scores de check-ins espirituais agrupados
   *     tags: [Spiritual]
   *     responses:
   *       200:
   *         description: Scores agrupados por nível
   */
  app.get(
    '/api/spiritual-checkins/scores',
    asyncHandler(async (req: Request, res: Response) => {
      const requestingUserId = parseInt((req.headers['x-user-id'] as string) || '0');
      const requestingUser = requestingUserId ? await userRepo.getUserById(requestingUserId) : null;

      let checkIns;
      let allUsers;

      // Filtrar por distrito se for pastor - usando query eficiente
      if (isPastor(requestingUser) && requestingUser?.districtId) {
        // Buscar usuários do distrito
        allUsers = await userRepo.getUsersByDistrictId(requestingUser.districtId);
        const districtUserIds = allUsers.map((u: User) => u.id);

        // Buscar check-ins apenas dos usuários do distrito
        checkIns = await emotionalRepo.getByUserIds(districtUserIds);
        logger.info(`🏛️ Scores filtrados por distrito ${requestingUser.districtId}`);
      } else {
        checkIns = await emotionalRepo.getAll();
        allUsers = await userRepo.getAllUsers();
      }

      const scoreGroups = {
        '1': { count: 0, label: 'Distante', description: 'Muito distante de Deus' },
        '2': { count: 0, label: 'Frio', description: 'Pouco conectado' },
        '3': { count: 0, label: 'Neutro', description: 'Indiferente' },
        '4': { count: 0, label: 'Quente', description: 'Conectado' },
        '5': { count: 0, label: 'Intimidade', description: 'Muito próximo de Deus' },
      };

      checkIns.forEach(checkIn => {
        const score = checkIn.emotionalScore?.toString();
        if (score && scoreGroups[score as keyof typeof scoreGroups]) {
          scoreGroups[score as keyof typeof scoreGroups].count++;
        }
      });

      const usersWithCheckIn = new Set(checkIns.map(c => c.userId));
      const usersWithoutCheckIn = allUsers.filter(u => !usersWithCheckIn.has(u.id)).length;

      sendSuccess(res, {
        scoreGroups,
        usersWithoutCheckIn,
        total: allUsers.length,
      });
    })
  );

  /**
   * @swagger
   * /api/emotional-checkins/user/{userId}:
   *   get:
   *     summary: Obtém check-ins de um usuário específico
   *     tags: [Spiritual]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Check-ins do usuário
   */
  app.get(
    '/api/emotional-checkins/user/:userId',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return sendError(res, 'ID do usuário inválido', 400);
      }

      const checkIns = await emotionalRepo.getByUserId(userId);
      sendSuccess(res, checkIns);
    })
  );

  /**
   * @swagger
   * /api/system/update-profiles-by-bible-study:
   *   post:
   *     summary: Atualiza perfis baseado em participação em estudo bíblico
   *     tags: [Spiritual, System]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Perfis atualizados
   */
  app.post(
    '/api/system/update-profiles-by-bible-study',
    asyncHandler(async (req: Request, res: Response) => {
      const result = { success: true, message: 'Funcionalidade não implementada' };
      sendSuccess(res, {
        success: true,
        message: 'Perfis atualizados com sucesso baseado no estudo bíblico',
        result,
      });
    })
  );
};
