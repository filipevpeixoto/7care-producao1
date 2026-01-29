/**
 * Event Routes Module
 * Endpoints relacionados a eventos e calendário
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { handleError } from '../utils/errorHandler';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createEventSchema } from '../schemas';
import { logger } from '../utils/logger';

export const eventRoutes = (app: Express): void => {
  const storage = new NeonAdapter();
  const resolveOrganizerId = (req: Request): number => {
    const headerValue = req.headers['x-user-id'];
    const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const parsed = rawValue ? parseInt(String(rawValue), 10) : NaN;
    return Number.isNaN(parsed) ? 1 : parsed;
  };
  const resolveChurchInfo = async (): Promise<{ id: number; name: string }> => {
    const defaultChurch = await storage.getDefaultChurch();
    if (defaultChurch?.id) {
      return { id: defaultChurch.id, name: defaultChurch.name || '' };
    }
    const churches = await storage.getAllChurches();
    const firstChurch = churches[0];
    if (firstChurch?.id) {
      return { id: firstChurch.id, name: firstChurch.name || '' };
    }
    return { id: 1, name: '' };
  };

  /**
   * @swagger
   * /api/events:
   *   get:
   *     summary: Lista todos os eventos
   *     tags: [Events]
   *     parameters:
   *       - in: query
   *         name: church
   *         schema:
   *           type: string
   *         description: Filtrar por igreja
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Data inicial
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Data final
   *     responses:
   *       200:
   *         description: Lista de eventos
   */
  app.get('/api/events', async (req: Request, res: Response) => {
    try {
      const { church, startDate, endDate } = req.query;
      let events = await storage.getAllEvents();

      if (church) {
        events = events.filter((e: { church?: string }) => e.church === church);
      }

      if (startDate) {
        const start = new Date(startDate as string);
        events = events.filter((e: { date?: string }) => new Date(e.date || '') >= start);
      }

      if (endDate) {
        const end = new Date(endDate as string);
        events = events.filter((e: { date?: string }) => new Date(e.date || '') <= end);
      }

      res.json(events);
    } catch (error) {
      handleError(res, error, 'Get events');
    }
  });

  /**
   * @swagger
   * /api/events:
   *   post:
   *     summary: Cria um novo evento
   *     tags: [Events]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - date
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               date:
   *                 type: string
   *                 format: date-time
   *               endDate:
   *                 type: string
   *                 format: date-time
   *               location:
   *                 type: string
   *               type:
   *                 type: string
   *               color:
   *                 type: string
   *               isRecurring:
   *                 type: boolean
   *               church:
   *                 type: string
   *     responses:
   *       201:
   *         description: Evento criado
   *       400:
   *         description: Dados inválidos
   */
  app.post('/api/events', validateBody(createEventSchema), async (req: Request, res: Response) => {
    try {
      const eventData = (req as ValidatedRequest<typeof createEventSchema._type>).validatedBody;
      logger.info(`Creating event: ${eventData.title}`);

      const organizerId = resolveOrganizerId(req);
      const churchInfo = await resolveChurchInfo();
      const churchId = eventData.churchId ?? churchInfo.id;
      const event = await storage.createEvent({
        ...eventData,
        description: eventData.description ?? '',
        time: eventData.time ?? '',
        location: eventData.location ?? '',
        recurrencePattern: eventData.recurrencePattern ?? '',
        maxParticipants: 0,
        isPublic: true,
        church: eventData.church ?? churchInfo.name,
        organizerId: eventData.organizerId ?? organizerId,
        churchId,
      });
      res.status(201).json(event);
    } catch (error) {
      handleError(res, error, 'Create event');
    }
  });

  /**
   * @swagger
   * /api/events:
   *   delete:
   *     summary: Remove múltiplos eventos
   *     tags: [Events]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               ids:
   *                 type: array
   *                 items:
   *                   type: integer
   *     responses:
   *       200:
   *         description: Eventos removidos
   */
  app.delete('/api/events', async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids)) {
        res.status(400).json({ error: 'IDs dos eventos são obrigatórios' });
        return;
      }

      for (const id of ids) {
        await storage.deleteEvent(id);
      }

      res.json({ success: true, message: `${ids.length} eventos removidos` });
    } catch (error) {
      handleError(res, error, 'Delete events');
    }
  });

  /**
   * @swagger
   * /api/event-types/{role}:
   *   get:
   *     summary: Lista tipos de eventos por role
   *     tags: [Events]
   *     parameters:
   *       - in: path
   *         name: role
   *         required: true
   *         schema:
   *           type: string
   *         description: Role do usuário
   *     responses:
   *       200:
   *         description: Lista de tipos de eventos permitidos
   */
  app.get('/api/event-types/:role', async (req: Request, res: Response) => {
    try {
      const { role } = req.params;

      // Tipos de eventos base
      const eventTypes = [
        { id: 'culto', name: 'Culto', color: '#3b82f6' },
        { id: 'estudo_biblico', name: 'Estudo Bíblico', color: '#10b981' },
        { id: 'reuniao', name: 'Reunião', color: '#f59e0b' },
        { id: 'evento_especial', name: 'Evento Especial', color: '#8b5cf6' },
        { id: 'visita', name: 'Visita', color: '#ec4899' },
        { id: 'batismo', name: 'Batismo', color: '#06b6d4' },
        { id: 'santa_ceia', name: 'Santa Ceia', color: '#84cc16' },
      ];

      // Admin e pastor têm acesso a todos os tipos
      if (role === 'superadmin' || role === 'pastor' || role === 'admin_readonly') {
        res.json(eventTypes);
        return;
      }

      // Outros roles têm tipos limitados
      const limitedTypes = eventTypes.filter(t =>
        ['culto', 'estudo_biblico', 'visita'].includes(t.id)
      );

      res.json(limitedTypes);
    } catch (error) {
      handleError(res, error, 'Get event types');
    }
  });

  /**
   * @swagger
   * /api/calendar/events:
   *   get:
   *     summary: Lista eventos do calendário
   *     tags: [Events, Calendar]
   *     responses:
   *       200:
   *         description: Lista de eventos do calendário
   */
  app.get('/api/calendar/events', async (req: Request, res: Response) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error) {
      handleError(res, error, 'Get calendar events');
    }
  });

  /**
   * @swagger
   * /api/calendar/events:
   *   post:
   *     summary: Cria evento no calendário
   *     tags: [Events, Calendar]
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
   *         description: Evento criado
   */
  app.post('/api/calendar/events', async (req: Request, res: Response) => {
    try {
      const eventData = req.body;
      const organizerId = resolveOrganizerId(req);
      const churchInfo = await resolveChurchInfo();
      const churchId = eventData?.churchId ?? churchInfo.id;
      const event = await storage.createEvent({
        ...eventData,
        description: eventData?.description ?? '',
        time: eventData?.time ?? '',
        location: eventData?.location ?? '',
        recurrencePattern: eventData?.recurrencePattern ?? '',
        maxParticipants: eventData?.maxParticipants ?? eventData?.capacity ?? 0,
        isPublic: true,
        church: eventData?.church ?? churchInfo.name,
        organizerId: eventData?.organizerId ?? organizerId,
        churchId,
      });
      res.status(201).json(event);
    } catch (error) {
      handleError(res, error, 'Create calendar event');
    }
  });
};
