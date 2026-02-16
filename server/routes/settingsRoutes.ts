/**
 * Settings Routes Module
 * Endpoints relacionados às configurações do sistema
 */

import { type Express, type Request, type Response } from 'express';
import { asyncHandler } from '../utils';
import { logger } from '../utils/logger';
import { validateBody, type ValidatedRequest } from '../middleware/validation';
import { setDefaultChurchSchema } from '../schemas';
import multer from 'multer';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { getRepository, getService } from '../container';
import { getAuthUserId } from '../utils/authHelpers';
import { uploadRateLimiter } from '../middleware';
import { UPLOAD } from '../constants';

/** Registers system settings routes */
export const settingsRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const churchRepo = getRepository('churchRepository');
  const meetingRepo = getRepository('meetingRepository');
  const pointsRepo = getRepository('pointsRepository');
  const systemRepo = getRepository('systemRepository');
  const pointsCalcService = getService('pointsCalculationService');

  /**
   * @swagger
   * /api/settings/default-church:
   *   get:
   *     summary: Obtém igreja padrão
   *     tags: [Settings]
   *     responses:
   *       200:
   *         description: Igreja padrão
   */
  app.get(
    '/api/settings/default-church',
    asyncHandler(async (_req: Request, res: Response) => {
      const defaultChurch = await churchRepo.getDefaultChurch();
      sendSuccess(res, { defaultChurch });
    })
  );

  /**
   * @swagger
   * /api/settings/default-church:
   *   post:
   *     summary: Define igreja padrão
   *     tags: [Settings]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               churchId:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Igreja padrão definida
   */
  app.post(
    '/api/settings/default-church',
    validateBody(setDefaultChurchSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { churchId } = (req as ValidatedRequest<typeof setDefaultChurchSchema._type>)
        .validatedBody;

      logger.info(`Setting default church: ${churchId}`);
      const success = await churchRepo.setDefaultChurch(
        typeof churchId === 'number' ? churchId : parseInt(String(churchId), 10)
      );
      if (success) {
        sendSuccess(res, null, 200, 'Default church updated successfully');
      } else {
        sendError(res, 'Failed to update default church', 400);
      }
    })
  );

  /**
   * @swagger
   * /api/settings/logo:
   *   post:
   *     summary: Upload do logo do sistema
   *     tags: [Settings]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               logo:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: Logo enviado com sucesso
   */
  app.post(
    '/api/settings/logo',
    uploadRateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return sendError(res, 'Unauthorized', 401);
      }

      const upload = multer({
        dest: 'uploads/',
        limits: { fileSize: UPLOAD.MAX_FILE_SIZE },
      }).single('logo');

      upload(req, res, async (err: unknown) => {
        if (err) {
          logger.error('Multer error:', err);
          const errorMessage = err instanceof Error ? err.message : 'Error uploading logo';
          res.status(400).json({
            success: false,
            message: errorMessage,
          });
          return;
        }

        const file = req.file;
        if (!file) {
          res.status(400).json({
            success: false,
            message: 'No logo file provided',
          });
          return;
        }

        const logoUrl = `/uploads/${file.filename}`;

        try {
          await systemRepo.saveLogo(logoUrl);
          logger.info(`System logo saved: ${logoUrl}`);
        } catch (dbError) {
          logger.error('Database error:', dbError);
          res.status(500).json({
            success: false,
            message: 'Database error while saving logo',
          });
          return;
        }

        sendSuccess(res, {
          success: true,
          message: 'Logo uploaded and saved successfully',
          logoUrl,
          filename: file.filename,
        });
      });
    })
  );

  /**
   * @swagger
   * /api/settings/logo:
   *   get:
   *     summary: Obtém logo do sistema
   *     tags: [Settings]
   *     responses:
   *       200:
   *         description: URL do logo
   */
  app.get(
    '/api/settings/logo',
    asyncHandler(async (_req: Request, res: Response) => {
      const logoData = await systemRepo.getLogo();

      if (logoData) {
        sendSuccess(res, {
          success: true,
          logoUrl: logoData,
          filename: logoData,
        });
      } else {
        sendSuccess(res, {
          success: true,
          logoUrl: null,
          filename: null,
        });
      }
    })
  );

  /**
   * @swagger
   * /api/settings/logo:
   *   delete:
   *     summary: Remove logo do sistema
   *     tags: [Settings]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Logo removido
   */
  app.delete(
    '/api/settings/logo',
    asyncHandler(async (_req: Request, res: Response) => {
      await systemRepo.clearLogo();
      sendSuccess(res, null, 200, 'Logo deleted successfully');
    })
  );

  /**
   * @swagger
   * /api/meeting-types:
   *   get:
   *     summary: Lista tipos de reunião
   *     tags: [Settings, Meetings]
   *     responses:
   *       200:
   *         description: Lista de tipos de reunião
   */
  app.get(
    '/api/meeting-types',
    asyncHandler(async (_req: Request, res: Response) => {
      const meetingTypes = await meetingRepo.getMeetingTypes();
      sendSuccess(res, meetingTypes);
    })
  );

  // ========== SITUATION LEVELS (per district) ==========

  /**
   * @swagger
   * /api/settings/my-district/situation-levels:
   *   get:
   *     summary: Obtém níveis de situação do distrito do usuário
   *     tags: [Settings]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Níveis de situação do distrito
   */
  app.get(
    '/api/settings/my-district/situation-levels',
    asyncHandler(async (req: Request, res: Response) => {
      const requestingUserId = getAuthUserId(req);

      if (!requestingUserId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const requestingUser = await userRepo.getUserById(requestingUserId);

      if (!requestingUser) {
        return sendError(res, 'Usuário não encontrado', 404);
      }

      const districtId = requestingUser.districtId;

      if (!districtId) {
        // Sem distrito, retorna níveis padrão
        return sendSuccess(res, { levels: null });
      }

      const stored = await systemRepo.getDistrictSetting(districtId, 'situation_levels');

      sendSuccess(res, { levels: stored ?? null });
    })
  );

  /**
   * @swagger
   * /api/settings/my-district/situation-levels:
   *   post:
   *     summary: Salva níveis de situação do distrito do usuário
   *     tags: [Settings]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Níveis de situação salvos
   */
  app.post(
    '/api/settings/my-district/situation-levels',
    asyncHandler(async (req: Request, res: Response) => {
      const requestingUserId = getAuthUserId(req);

      if (!requestingUserId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const requestingUser = await userRepo.getUserById(requestingUserId);

      if (!requestingUser) {
        return sendError(res, 'Usuário não encontrado', 404);
      }

      if (requestingUser.role !== 'pastor' && requestingUser.role !== 'superadmin') {
        return sendError(res, 'Apenas pastores podem configurar níveis de situação', 403);
      }

      const districtId = requestingUser.districtId;

      if (!districtId) {
        return sendError(res, 'Usuário não possui distrito associado', 400);
      }

      const { levels } = req.body;

      if (!Array.isArray(levels)) {
        return sendError(res, 'Formato inválido: levels deve ser um array', 400);
      }

      await systemRepo.saveDistrictSetting(districtId, 'situation_levels', levels);

      logger.info(`Situation levels saved for district ${districtId} by user ${requestingUserId}`);

      sendSuccess(res, { levels }, 200, 'Níveis de situação salvos com sucesso');
    })
  );

  // ========== POINTS CONFIG ==========

  /**
   * @swagger
   * /api/settings/my-district/points-config:
   *   get:
   *     summary: Obtém configuração de pontos do distrito do usuário
   *     tags: [Settings, Points]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Configuração de pontos do distrito
   */
  app.get(
    '/api/settings/my-district/points-config',
    asyncHandler(async (req: Request, res: Response) => {
      const requestingUserId = getAuthUserId(req);

      if (!requestingUserId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const requestingUser = await userRepo.getUserById(requestingUserId);

      if (!requestingUser) {
        return sendError(res, 'Usuário não encontrado', 404);
      }

      // Verificar se o usuário é pastor e tem distrito
      const districtId = requestingUser.districtId;

      // Buscar configuração global (a mesma para todos, mas retornar info do distrito)
      const config = await pointsRepo.getConfiguration();

      sendSuccess(res, {
        districtId: districtId || null,
        isGlobal: true, // Por enquanto, config é global
        config: config || {},
      });
    })
  );

  /**
   * @swagger
   * /api/settings/my-district/points-config:
   *   post:
   *     summary: Salva configuração de pontos do distrito do usuário
   *     tags: [Settings, Points]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Configuração salva
   */
  app.post(
    '/api/settings/my-district/points-config',
    asyncHandler(async (req: Request, res: Response) => {
      const requestingUserId = getAuthUserId(req);

      if (!requestingUserId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const requestingUser = await userRepo.getUserById(requestingUserId);

      if (!requestingUser) {
        return sendError(res, 'Usuário não encontrado', 404);
      }

      const { config } = req.body;
      const districtId = requestingUser.districtId;

      // Salvar configuração global
      await pointsRepo.saveConfiguration(config);

      // Recalcular pontos apenas do distrito se for pastor
      let districtFilter: number | null = null;
      if (requestingUser.role === 'pastor' && districtId) {
        districtFilter = districtId;
        logger.info(`🏛️ Salvando config e recalculando pontos do distrito: ${districtFilter}`);
      }

      const result = await pointsCalcService.calculateAdvancedUserPoints(districtFilter);

      sendSuccess(res, {
        success: true,
        message: `Configuração salva! ${result.updatedUsers || 0} usuários atualizados.`,
        updatedUsers: result.updatedUsers || 0,
        districtId: districtId || null,
      });
    })
  );

  /**
   * @swagger
   * /api/settings/my-district/points-config/reset:
   *   post:
   *     summary: Reseta configuração de pontos do distrito
   *     tags: [Settings, Points]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Configuração resetada
   */
  app.post(
    '/api/settings/my-district/points-config/reset',
    asyncHandler(async (req: Request, res: Response) => {
      const requestingUserId = getAuthUserId(req);

      if (!requestingUserId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const requestingUser = await userRepo.getUserById(requestingUserId);

      if (!requestingUser) {
        return sendError(res, 'Usuário não encontrado', 404);
      }

      const districtId = requestingUser.districtId;

      // Recalcular pontos apenas do distrito se for pastor
      let districtFilter: number | null = null;
      if (requestingUser.role === 'pastor' && districtId) {
        districtFilter = districtId;
        logger.info(`🏛️ Reset e recálculo de pontos do distrito: ${districtFilter}`);
      }

      const result = await pointsCalcService.calculateAdvancedUserPoints(districtFilter);

      sendSuccess(res, {
        success: true,
        message: `Configuração resetada! ${result.updatedUsers || 0} usuários atualizados.`,
        updatedUsers: result.updatedUsers || 0,
        districtId: districtId || null,
      });
    })
  );
};
