/**
 * Settings Routes Module
 * Endpoints relacionados às configurações do sistema
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { asyncHandler, sendSuccess, sendError } from '../utils';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { setDefaultChurchSchema } from '../schemas';
import multer from 'multer';

export const settingsRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

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
    asyncHandler(async (req: Request, res: Response) => {
      const defaultChurch = await storage.getDefaultChurch();
      res.json({ defaultChurch });
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
      const success = await storage.setDefaultChurch(
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
    asyncHandler(async (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return sendError(res, 'Unauthorized', 401);
      }

      const upload = multer({
        dest: 'uploads/',
        limits: { fileSize: 5 * 1024 * 1024 },
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
          await storage.saveSystemLogo(logoUrl);
          logger.info(`System logo saved: ${logoUrl}`);
        } catch (dbError) {
          logger.error('Database error:', dbError);
          res.status(500).json({
            success: false,
            message: 'Database error while saving logo',
          });
          return;
        }

        res.json({
          success: true,
          message: 'Logo uploaded and saved successfully',
          logoUrl: logoUrl,
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
    asyncHandler(async (req: Request, res: Response) => {
      const logoData = await storage.getSystemLogo();

      if (logoData) {
        res.json({
          success: true,
          logoUrl: logoData,
          filename: logoData,
        });
      } else {
        res.json({
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
    asyncHandler(async (req: Request, res: Response) => {
      await storage.clearSystemLogo();
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
    asyncHandler(async (req: Request, res: Response) => {
      const meetingTypes = await storage.getMeetingTypes();
      res.json(meetingTypes);
    })
  );
};
