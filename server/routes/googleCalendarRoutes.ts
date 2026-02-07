/**
 * Google Calendar Routes Module
 * Endpoints para integração OAuth2 com Google Calendar e sincronização de eventos
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { GoogleCalendarService } from '../services/googleCalendarService';
import { logger } from '../utils/logger';
import { asyncHandler, sendSuccess, sendError } from '../utils';
import { hasAdminAccess, isPastor } from '../utils/permissions';
import { getRepository } from '../container';

export const googleCalendarRoutes = (app: Express): void => {
  // NeonAdapter mantido apenas para GoogleCalendarService (TODO: refatorar service)
  const storage = new NeonAdapter();
  const googleCalendar = new GoogleCalendarService(storage);
  const userRepo = getRepository('userRepository');
  const systemRepo = getRepository('systemRepository');

  /**
   * Resolve user ID from headers
   */
  const resolveUserId = (req: Request): number => {
    const headerValue = req.headers['x-user-id'];
    const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const parsed = rawValue ? parseInt(String(rawValue), 10) : NaN;
    if (Number.isNaN(parsed)) {
      throw new Error('User ID não fornecido ou inválido');
    }
    return parsed;
  };

  /**
   * Middleware to check authorization
   */
  const checkAuthorization = async (req: Request, res: Response, next: Function) => {
    try {
      const userId = resolveUserId(req);
      const user = await userRepo.getUserById(userId);

      if (!user) {
        return sendError(res, 'Usuário não encontrado', 404);
      }

      if (!hasAdminAccess(user) && !isPastor(user)) {
        return sendError(
          res,
          'Acesso negado. Apenas pastores e admins podem usar esta funcionalidade.',
          403
        );
      }

      (req as any).user = user;
      next();
    } catch (error) {
      return sendError(res, (error as Error).message, 401);
    }
  };

  // ============================================
  // OAUTH2 AUTHENTICATION
  // ============================================

  /**
   * @swagger
   * /api/calendar/google/auth-url:
   *   post:
   *     summary: Gera URL de autorização OAuth2 do Google Calendar
   *     tags: [Google Calendar]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: URL de autorização gerada
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 authUrl:
   *                   type: string
   *                 state:
   *                   type: string
   */
  app.post(
    '/api/calendar/google/auth-url',
    checkAuthorization,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = resolveUserId(req);

      logger.info(`🔐 Gerando URL de autorização Google Calendar para userId: ${userId}`);

      const { authUrl, state } = await googleCalendar.getAuthUrl(userId);

      sendSuccess(res, { authUrl, state }, 200);
    })
  );

  /**
   * @swagger
   * /api/calendar/google/oauth-callback:
   *   get:
   *     summary: Callback OAuth2 do Google (recebe code e state)
   *     tags: [Google Calendar]
   *     parameters:
   *       - in: query
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: state
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       302:
   *         description: Redireciona para settings com status
   */
  app.get(
    '/api/calendar/google/oauth-callback',
    asyncHandler(async (req: Request, res: Response) => {
      const { code, state } = req.query;

      if (!code || !state) {
        logger.error('❌ Callback OAuth sem code ou state');
        return res.redirect('/settings?tab=calendar&status=error&message=Parâmetros inválidos');
      }

      try {
        logger.info('🔄 Processando callback OAuth do Google Calendar');

        await googleCalendar.exchangeCodeForTokens(code as string, state as string);

        logger.info('✅ Tokens salvos com sucesso');

        // Redirect to settings with success
        res.redirect('/settings?tab=calendar&status=success&message=Conectado ao Google Calendar');
      } catch (error) {
        logger.error('❌ Erro no callback OAuth:', error);
        const errorMessage = encodeURIComponent((error as Error).message);
        res.redirect(`/settings?tab=calendar&status=error&message=${errorMessage}`);
      }
    })
  );

  /**
   * @swagger
   * /api/calendar/google/disconnect:
   *   delete:
   *     summary: Desconecta conta Google Calendar
   *     tags: [Google Calendar]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Desconectado com sucesso
   */
  app.delete(
    '/api/calendar/google/disconnect',
    checkAuthorization,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = resolveUserId(req);

      logger.info(`🔓 Desconectando Google Calendar para userId: ${userId}`);

      await googleCalendar.revokeAccess(userId);

      sendSuccess(res, null, 200, 'Desconectado do Google Calendar');
    })
  );

  // ============================================
  // STATUS & CONFIG
  // ============================================

  /**
   * @swagger
   * /api/calendar/google/status:
   *   get:
   *     summary: Retorna status de conexão com Google Calendar
   *     tags: [Google Calendar]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Status de conexão
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 connected:
   *                   type: boolean
   *                 email:
   *                   type: string
   *                 lastSync:
   *                   type: string
   */
  app.get(
    '/api/calendar/google/status',
    checkAuthorization,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = resolveUserId(req);

      const status = await googleCalendar.getConnectionStatus(userId);

      sendSuccess(res, status, 200);
    })
  );

  /**
   * @swagger
   * /api/calendar/google/config:
   *   get:
   *     summary: Retorna configuração salva do usuário
   *     tags: [Google Calendar]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Configuração do usuário
   */
  app.get(
    '/api/calendar/google/config',
    checkAuthorization,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = resolveUserId(req);

      const config = await systemRepo.getGoogleCalendarConfig(userId);

      sendSuccess(res, config || {}, 200);
    })
  );

  /**
   * @swagger
   * /api/calendar/google/config:
   *   post:
   *     summary: Salva configuração de sincronização
   *     tags: [Google Calendar]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               calendarId:
   *                 type: string
   *               autoSync:
   *                 type: boolean
   *               syncInterval:
   *                 type: number
   *     responses:
   *       200:
   *         description: Configuração salva
   */
  app.post(
    '/api/calendar/google/config',
    checkAuthorization,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = resolveUserId(req);
      const { calendarId, autoSync, syncInterval } = req.body;

      if (!calendarId) {
        return sendError(res, 'calendarId é obrigatório', 400);
      }

      logger.info(`💾 Salvando config Google Calendar para userId: ${userId}`);

      await systemRepo.saveGoogleCalendarConfig(userId, {
        userId,
        calendarId,
        autoSync: autoSync ?? false,
        syncInterval: syncInterval ?? 60,
      });

      sendSuccess(res, null, 200, 'Configuração salva');
    })
  );

  // ============================================
  // CALENDAR OPERATIONS
  // ============================================

  /**
   * @swagger
   * /api/calendar/google/calendars:
   *   get:
   *     summary: Lista calendários disponíveis do usuário
   *     tags: [Google Calendar]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Lista de calendários
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: string
   *                   name:
   *                     type: string
   *                   description:
   *                     type: string
   *                   primary:
   *                     type: boolean
   */
  app.get(
    '/api/calendar/google/calendars',
    checkAuthorization,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = resolveUserId(req);

      logger.info(`📅 Listando calendários para userId: ${userId}`);

      const calendars = await googleCalendar.listCalendars(userId);

      sendSuccess(res, calendars, 200);
    })
  );

  /**
   * @swagger
   * /api/calendar/google/sync:
   *   post:
   *     summary: Sincroniza eventos do Google Calendar
   *     tags: [Google Calendar]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               calendarId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Sincronização concluída
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 imported:
   *                   type: number
   *                 updated:
   *                   type: number
   *                 skipped:
   *                   type: number
   *                 errors:
   *                   type: array
   *                   items:
   *                     type: string
   */
  app.post(
    '/api/calendar/google/sync',
    checkAuthorization,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = resolveUserId(req);
      const { calendarId } = req.body;

      if (!calendarId) {
        return sendError(res, 'calendarId é obrigatório', 400);
      }

      logger.info(
        `🔄 Sincronizando eventos do Google Calendar para userId: ${userId}, calendarId: ${calendarId}`
      );

      const result = await googleCalendar.syncEvents(userId, calendarId);

      logger.info(
        `✅ Sincronização concluída: ${result.imported} importados, ${result.updated} atualizados, ${result.skipped} ignorados`
      );

      sendSuccess(res, result, 200, 'Sincronização concluída');
    })
  );

  logger.info('✅ Google Calendar routes registered');
};

export default googleCalendarRoutes;
