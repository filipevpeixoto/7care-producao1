/**
 * Calendar Routes Module
 * Endpoints relacionados ao calendário e integração com Google Drive
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { googleDriveConfigSchema } from '../schemas';

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
    async (req: Request, res: Response) => {
      try {
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

        res.json({ success: true, message: 'Configuração salva' });
      } catch (error) {
        handleError(res, error, 'Save Google Drive config');
      }
    }
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
  app.get('/api/calendar/google-drive-config', async (req: Request, res: Response) => {
    try {
      const config = await storage.getGoogleDriveConfig();
      res.json(config || {});
    } catch (error) {
      handleError(res, error, 'Get Google Drive config');
    }
  });

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
  app.post('/api/calendar/test-google-drive', async (req: Request, res: Response) => {
    try {
      const { spreadsheetUrl, sheetName, apiKey } = req.body;

      // Extrair ID da planilha da URL
      const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);

      if (!spreadsheetIdMatch) {
        res.status(400).json({ error: 'URL da planilha inválida' });
        return;
      }

      const spreadsheetId = spreadsheetIdMatch[1];

      // Testar conexão com a API do Google Sheets
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        res.status(400).json({
          error: 'Erro ao conectar com Google Sheets',
          details: errorData.error?.message || 'Verifique as configurações',
        });
        return;
      }

      const data = await response.json();

      res.json({
        success: true,
        message: 'Conexão bem-sucedida',
        rowCount: data.values?.length || 0,
      });
    } catch (error) {
      handleError(res, error, 'Test Google Drive connection');
    }
  });

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
  app.post('/api/calendar/sync-google-drive', async (req: Request, res: Response) => {
    try {
      const config = await storage.getGoogleDriveConfig();

      if (!config || !config.spreadsheetUrl) {
        res.status(400).json({ error: 'Google Drive não configurado' });
        return;
      }

      // Extrair ID da planilha
      const spreadsheetIdMatch = config.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);

      if (!spreadsheetIdMatch) {
        res.status(400).json({ error: 'URL da planilha inválida' });
        return;
      }

      const spreadsheetId = spreadsheetIdMatch[1];
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${config.sheetName}?key=${config.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        res.status(400).json({ error: 'Erro ao buscar dados do Google Sheets' });
        return;
      }

      const data = await response.json();
      const rows = data.values || [];

      if (rows.length < 2) {
        res.json({ success: true, message: 'Nenhum evento para importar', imported: 0 });
        return;
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

      res.json({
        success: true,
        message: `Sincronização concluída`,
        imported,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      handleError(res, error, 'Sync Google Drive');
    }
  });

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
  app.post('/api/google-sheets/proxy', async (req: Request, res: Response) => {
    try {
      const { url, action, spreadsheetId, sheetName } = req.body;

      // Se for uma ação do Google Sheets (getTasks, etc.)
      if (action && spreadsheetId) {
        // Construir URL do Google Apps Script
        const _scriptUrl = `https://script.google.com/macros/s/AKfycbxxxxx/exec?action=${action}&spreadsheetId=${spreadsheetId}&sheetName=${sheetName || 'tarefas'}`;

        // Por enquanto, retornar array vazio se não houver URL do script configurada
        // Isso permite que o sistema funcione sem o Google Sheets
        res.json({ tasks: [], success: true, message: 'Google Sheets não configurado' });
        return;
      }

      if (!url) {
        res.status(400).json({ error: 'URL é obrigatória' });
        return;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        res.status(response.status).json(errorData);
        return;
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      handleError(res, error, 'Google Sheets proxy');
    }
  });

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
  app.get('/api/activities', async (req: Request, res: Response) => {
    try {
      const activities = await storage.getAllActivities();
      res.json(activities);
    } catch (error) {
      handleError(res, error, 'Get activities');
    }
  });

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
  app.post('/api/activities', async (req: Request, res: Response) => {
    try {
      const activityData = req.body;
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      handleError(res, error, 'Create activity');
    }
  });

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
  app.put('/api/activities/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const activityData = req.body;

      const activity = await storage.updateActivity(id, activityData);

      if (!activity) {
        res.status(404).json({ error: 'Atividade não encontrada' });
        return;
      }

      res.json(activity);
    } catch (error) {
      handleError(res, error, 'Update activity');
    }
  });

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
  app.delete('/api/activities/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteActivity(id);
      res.json({ success: true, message: 'Atividade removida' });
    } catch (error) {
      handleError(res, error, 'Delete activity');
    }
  });
};
