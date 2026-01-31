/**
 * Calendar Routes Module
 * Endpoints relacionados ao calendário e integração com Google Drive
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { googleDriveConfigSchema } from '../schemas';
import { asyncHandler, sendSuccess, sendError, sendNotFound } from '../utils';

export const calendarRoutes = (app: Express): void => {
  const storage = new NeonAdapter();
  const resolveOrganizerId = (req: Request): number => {
    const headerValue = req.headers['x-user-id'];
    const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const parsed = rawValue ? parseInt(String(rawValue), 10) : NaN;
    return Number.isNaN(parsed) ? 1 : parsed;
  };
  const resolveChurchId = async (): Promise<number> => {
    const defaultChurch = await storage.getDefaultChurch();
    if (defaultChurch?.id) {
      return defaultChurch.id;
    }
    const churches = await storage.getAllChurches();
    return churches[0]?.id ?? 1;
  };

  /**
   * @swagger
   * /api/calendar/google-drive-config:
   *   post:
   *     summary: Salva configuração do Google Drive
   *     tags: [Calendar, Settings]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               spreadsheetUrl:
   *                 type: string
   *               sheetName:
   *                 type: string
   *               apiKey:
   *                 type: string
   *     responses:
   *       200:
   *         description: Configuração salva
   */
  app.post(
    '/api/calendar/google-drive-config',
    validateBody(googleDriveConfigSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { spreadsheetUrl, sheetName, apiKey } = (
        req as ValidatedRequest<typeof googleDriveConfigSchema._type>
      ).validatedBody;

      logger.info('Saving Google Drive config');
      await storage.saveGoogleDriveConfig({
        spreadsheetUrl,
        sheetName,
        apiKey,
        updatedAt: new Date().toISOString(),
      });

      sendSuccess(res, null, 200, 'Configuração salva');
    })
  );

  /**
   * @swagger
   * /api/calendar/google-drive-config:
   *   get:
   *     summary: Obtém configuração do Google Drive
   *     tags: [Calendar, Settings]
   *     responses:
   *       200:
   *         description: Configuração atual
   */
  app.get(
    '/api/calendar/google-drive-config',
    asyncHandler(async (req: Request, res: Response) => {
      const config = await storage.getGoogleDriveConfig();
      sendSuccess(res, config || {});
    })
  );

  /**
   * @swagger
   * /api/calendar/test-google-drive:
   *   post:
   *     summary: Testa conexão com Google Drive
   *     tags: [Calendar]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               spreadsheetUrl:
   *                 type: string
   *               sheetName:
   *                 type: string
   *               apiKey:
   *                 type: string
   *     responses:
   *       200:
   *         description: Teste bem-sucedido
   *       400:
   *         description: Erro na conexão
   */
  app.post(
    '/api/calendar/test-google-drive',
    asyncHandler(async (req: Request, res: Response) => {
      const { spreadsheetUrl, sheetName, apiKey } = req.body;

      // Extrair ID da planilha da URL
      const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);

      if (!spreadsheetIdMatch) {
        return sendError(res, 'URL da planilha inválida', 400);
      }

      const spreadsheetId = spreadsheetIdMatch[1];

      // Testar conexão com a API do Google Sheets
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        return sendError(
          res,
          `Erro ao conectar com Google Sheets: ${errorData.error?.message || 'Verifique as configurações'}`,
          400
        );
      }

      const data = await response.json();

      sendSuccess(res, { rowCount: data.values?.length || 0 }, 200, 'Conexão bem-sucedida');
    })
  );

  /**
   * @swagger
   * /api/calendar/sync-google-drive:
   *   post:
   *     summary: Sincroniza eventos do Google Drive
   *     tags: [Calendar]
   *     security:
   *       - userId: []
   *     responses:
   *       200:
   *         description: Sincronização concluída
   */
  app.post(
    '/api/calendar/sync-google-drive',
    asyncHandler(async (req: Request, res: Response) => {
      const config = await storage.getGoogleDriveConfig();

      if (!config || !config.spreadsheetUrl) {
        return sendError(res, 'Google Drive não configurado', 400);
      }

      // Extrair ID da planilha
      const spreadsheetIdMatch = config.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);

      if (!spreadsheetIdMatch) {
        return sendError(res, 'URL da planilha inválida', 400);
      }

      const spreadsheetId = spreadsheetIdMatch[1];
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${config.sheetName}?key=${config.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        return sendError(res, 'Erro ao buscar dados do Google Sheets', 400);
      }

      const data = await response.json();
      const rows = data.values || [];

      if (rows.length < 2) {
        return sendSuccess(res, { imported: 0 }, 200, 'Nenhum evento para importar');
      }

      // Primeira linha é o cabeçalho
      const headers = rows[0];
      const events = rows.slice(1);

      let imported = 0;
      const errors: string[] = [];

      const organizerId = resolveOrganizerId(req);
      const churchId = await resolveChurchId();

      for (const row of events) {
        try {
          const eventData: Record<string, string> = {};
          headers.forEach((header: string, index: number) => {
            eventData[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
          });

          // Mapear campos
          const event = {
            title: eventData.titulo || eventData.title || eventData.evento || 'Evento sem título',
            description: eventData.descricao || eventData.description || '',
            date: eventData.data || eventData.date || new Date().toISOString(),
            endDate: eventData.data_fim || eventData.end_date || null,
            time: eventData.hora || eventData.time || '',
            location: eventData.local || eventData.location || '',
            type: eventData.tipo || eventData.type || 'evento',
            color: eventData.cor || eventData.color || '#3b82f6',
            church: eventData.igreja || eventData.church || '',
            isRecurring: false,
            recurrencePattern: '',
            maxParticipants: 0,
            isPublic: true,
            organizerId,
            churchId,
          };

          await storage.createEvent(event);
          imported++;
        } catch (err) {
          errors.push(`Erro na linha ${imported + 2}: ${err}`);
        }
      }

      sendSuccess(
        res,
        { imported, errors: errors.length > 0 ? errors : undefined },
        200,
        'Sincronização concluída'
      );
    })
  );

  /**
   * @swagger
   * /api/google-sheets/proxy:
   *   post:
   *     summary: Proxy para Google Sheets API
   *     tags: [Calendar]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - url
   *             properties:
   *               url:
   *                 type: string
   *     responses:
   *       200:
   *         description: Dados da planilha
   */
  app.post(
    '/api/google-sheets/proxy',
    asyncHandler(async (req: Request, res: Response) => {
      const { url, action, spreadsheetId, sheetName } = req.body;

      // Se for uma ação do Google Sheets (getTasks, etc.)
      if (action && spreadsheetId) {
        // Construir URL do Google Apps Script
        const _scriptUrl = `https://script.google.com/macros/s/AKfycbxxxxx/exec?action=${action}&spreadsheetId=${spreadsheetId}&sheetName=${sheetName || 'tarefas'}`;

        // Por enquanto, retornar array vazio se não houver URL do script configurada
        // Isso permite que o sistema funcione sem o Google Sheets
        return sendSuccess(res, { tasks: [] }, 200, 'Google Sheets não configurado');
      }

      if (!url) {
        return sendError(res, 'URL é obrigatória', 400);
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        return sendError(res, errorData.error?.message || 'Erro na requisição', response.status);
      }

      const data = await response.json();
      sendSuccess(res, data);
    })
  );

  /**
   * @swagger
   * /api/activities:
   *   get:
   *     summary: Lista atividades do calendário
   *     tags: [Calendar]
   *     responses:
   *       200:
   *         description: Lista de atividades
   */
  app.get(
    '/api/activities',
    asyncHandler(async (req: Request, res: Response) => {
      const activities = await storage.getAllActivities();
      sendSuccess(res, activities);
    })
  );

  /**
   * @swagger
   * /api/activities:
   *   post:
   *     summary: Cria atividade
   *     tags: [Calendar]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       201:
   *         description: Atividade criada
   */
  app.post(
    '/api/activities',
    asyncHandler(async (req: Request, res: Response) => {
      const activityData = req.body;
      const activity = await storage.createActivity(activityData);
      sendSuccess(res, activity, 201, 'Atividade criada');
    })
  );

  /**
   * @swagger
   * /api/activities/{id}:
   *   put:
   *     summary: Atualiza atividade
   *     tags: [Calendar]
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
   *         description: Atividade atualizada
   */
  app.put(
    '/api/activities/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const activityData = req.body;

      const activity = await storage.updateActivity(id, activityData);

      if (!activity) {
        return sendNotFound(res, 'Atividade');
      }

      sendSuccess(res, activity, 200, 'Atividade atualizada');
    })
  );

  /**
   * @swagger
   * /api/activities/{id}:
   *   delete:
   *     summary: Remove atividade
   *     tags: [Calendar]
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
   *         description: Atividade removida
   */
  app.delete(
    '/api/activities/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      await storage.deleteActivity(id);
      sendSuccess(res, null, 200, 'Atividade removida');
    })
  );
};
