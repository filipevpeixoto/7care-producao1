/**
 * Settings Routes Module
 * Endpoints relacionados às configurações do sistema
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { handleError } from '../utils/errorHandler';
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
  app.get("/api/settings/default-church", async (req: Request, res: Response) => {
    try {
      const defaultChurch = await storage.getDefaultChurch();
      res.json({ defaultChurch });
    } catch (error) {
      handleError(res, error, "Get default church");
    }
  });

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
  app.post("/api/settings/default-church", validateBody(setDefaultChurchSchema), async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as ValidatedRequest<typeof setDefaultChurchSchema._type>).validatedBody;

      logger.info(`Setting default church: ${churchId}`);
      const success = await storage.setDefaultChurch(churchId);
      if (success) {
        res.json({ success: true, message: "Default church updated successfully" });
      } else {
        res.status(400).json({ error: "Failed to update default church" });
      }
    } catch (error) {
      handleError(res, error, "Set default church");
    }
  });

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
  app.post("/api/settings/logo", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({ success: false, message: "Unauthorized" }); return;
      }

      const upload = multer({
        dest: 'uploads/',
        limits: { fileSize: 5 * 1024 * 1024 }
      }).single('logo');

      upload(req, res, async (err: unknown) => {
        if (err) {
          logger.error("Multer error:", err);
          const errorMessage = err instanceof Error ? err.message : "Error uploading logo";
          res.status(400).json({
            success: false,
            message: errorMessage
          });
          return;
        }

        const file = req.file;
        if (!file) {
          res.status(400).json({
            success: false,
            message: "No logo file provided"
          });
          return;
        }

        const logoUrl = `/uploads/${file.filename}`;

        try {
          await storage.saveSystemLogo(logoUrl);
          logger.info(`System logo saved: ${logoUrl}`);
        } catch (dbError) {
          logger.error("Database error:", dbError);
          res.status(500).json({
            success: false,
            message: "Database error while saving logo"
          });
          return;
        }

        res.json({
          success: true,
          message: "Logo uploaded and saved successfully",
          logoUrl: logoUrl,
          filename: file.filename
        });
      });
    } catch (error) {
      handleError(res, error, "Logo upload");
    }
  });

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
  app.get("/api/settings/logo", async (req: Request, res: Response) => {
    try {
      const logoData = await storage.getSystemLogo();

      if (logoData) {
        res.json({
          success: true,
          logoUrl: logoData,
          filename: logoData
        });
      } else {
        res.json({
          success: true,
          logoUrl: null,
          filename: null
        });
      }
    } catch (error) {
      handleError(res, error, "Get logo");
    }
  });

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
  app.delete("/api/settings/logo", async (req: Request, res: Response) => {
    try {
      await storage.clearSystemLogo();
      res.json({
        success: true,
        message: "Logo deleted successfully"
      });
    } catch (error) {
      handleError(res, error, "Delete logo");
    }
  });

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
  app.get("/api/meeting-types", async (req: Request, res: Response) => {
    try {
      const meetingTypes = await storage.getMeetingTypes();
      res.json(meetingTypes);
    } catch (error) {
      handleError(res, error, "Get meeting types");
    }
  });
};
