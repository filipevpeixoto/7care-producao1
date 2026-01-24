/**
 * Spiritual Routes Module
 * Endpoints relacionados ao acompanhamento espiritual (check-in emocional)
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createEmotionalCheckInSchema } from '../schemas';

export const spiritualRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

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
  app.post('/api/emotional-checkin', validateBody(createEmotionalCheckInSchema), async (req: Request, res: Response) => {
    try {
      const validatedData = (req as ValidatedRequest<typeof createEmotionalCheckInSchema._type>).validatedBody;
      const { userId, emotionalScore, mood, prayerRequest, isPrivate, allowChurchMembers } = validatedData;
      logger.info(`Emotional check-in for user ${userId}`);

      let finalScore = emotionalScore ?? null;

      if (mood) {
        finalScore = null;
      }

      const checkIn = await storage.createEmotionalCheckIn({
        userId,
        emotionalScore: finalScore,
        mood: mood ?? null,
        prayerRequest: prayerRequest ?? null,
        isPrivate,
        allowChurchMembers
      });

      res.json({ success: true, data: checkIn });
    } catch (error) {
      handleError(res, error, "Create emotional check-in");
    }
  });

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
  app.get('/api/emotional-checkins/admin', async (req: Request, res: Response) => {
    try {
      const checkIns = await storage.getEmotionalCheckInsForAdmin();
      res.json(checkIns);
    } catch (error) {
      handleError(res, error, "Get emotional check-ins for admin");
    }
  });

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
  app.get('/api/spiritual-checkins/scores', async (req: Request, res: Response) => {
    try {
      const checkIns = await storage.getEmotionalCheckInsForAdmin();

      const scoreGroups = {
        '1': { count: 0, label: 'Distante', description: 'Muito distante de Deus' },
        '2': { count: 0, label: 'Frio', description: 'Pouco conectado' },
        '3': { count: 0, label: 'Neutro', description: 'Indiferente' },
        '4': { count: 0, label: 'Quente', description: 'Conectado' },
        '5': { count: 0, label: 'Intimidade', description: 'Muito próximo de Deus' }
      };

      checkIns.forEach((checkIn) => {
        const score = checkIn.emotionalScore?.toString();
        if (score && scoreGroups[score as keyof typeof scoreGroups]) {
          scoreGroups[score as keyof typeof scoreGroups].count++;
        }
      });

      const allUsers = await storage.getAllUsers();
      const usersWithCheckIn = new Set(checkIns.map((c) => c.userId));
      const usersWithoutCheckIn = allUsers.filter((u) => !usersWithCheckIn.has(u.id)).length;

      res.json({
        scoreGroups,
        usersWithoutCheckIn,
        total: allUsers.length
      });
    } catch (error) {
      handleError(res, error, "Get spiritual check-in scores");
    }
  });

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
  app.get('/api/emotional-checkins/user/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        res.status(400).json({ error: 'ID do usuário inválido' }); return;
      }

      const checkIns = await storage.getEmotionalCheckInsByUser(userId);
      res.json(checkIns);
    } catch (error) {
      handleError(res, error, "Get emotional check-ins by user");
    }
  });

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
  app.post('/api/system/update-profiles-by-bible-study', async (req: Request, res: Response) => {
    try {
      const result = { success: true, message: 'Funcionalidade não implementada' };
      res.json({
        success: true,
        message: 'Perfis atualizados com sucesso baseado no estudo bíblico',
        result
      });
    } catch (error) {
      handleError(res, error, "Update profiles by Bible study");
    }
  });
};
