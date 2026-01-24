/**
 * Meeting Routes Module
 * Endpoints relacionados a reuniões e agendamentos
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createMeetingSchema, updateMeetingSchema } from '../schemas';

export const meetingRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

  /**
   * @swagger
   * /api/meetings:
   *   get:
   *     summary: Lista todas as reuniões
   *     tags: [Meetings]
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *         description: Filtrar por usuário
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, approved, rejected, completed, cancelled]
   *         description: Filtrar por status
   *     responses:
   *       200:
   *         description: Lista de reuniões
   */
  app.get("/api/meetings", async (req: Request, res: Response) => {
    try {
      const { userId, status } = req.query;
      let meetings = await storage.getAllMeetings();

      if (userId) {
        const id = parseInt(userId as string);
        meetings = meetings.filter((m: { requesterId?: number; assignedToId?: number }) =>
          m.requesterId === id || m.assignedToId === id
        );
      }

      if (status) {
        meetings = meetings.filter((m: { status?: string }) => m.status === status);
      }

      res.json(meetings);
    } catch (error) {
      handleError(res, error, "Get meetings");
    }
  });

  /**
   * @swagger
   * /api/meetings:
   *   post:
   *     summary: Cria uma nova reunião
   *     tags: [Meetings]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - requesterId
   *               - title
   *               - scheduledAt
   *             properties:
   *               requesterId:
   *                 type: integer
   *               assignedToId:
   *                 type: integer
   *               typeId:
   *                 type: integer
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               scheduledAt:
   *                 type: string
   *                 format: date-time
   *               duration:
   *                 type: integer
   *                 default: 60
   *               location:
   *                 type: string
   *               priority:
   *                 type: string
   *                 enum: [low, medium, high]
   *               isUrgent:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Reunião criada
   *       400:
   *         description: Dados inválidos
   */
  app.post("/api/meetings", validateBody(createMeetingSchema), async (req: Request, res: Response) => {
    try {
      const meetingData = (req as ValidatedRequest<typeof createMeetingSchema._type>).validatedBody;
      logger.info(`Creating meeting: ${meetingData.title}`);
      const meeting = await storage.createMeeting({
        ...meetingData,
        notes: meetingData.notes ?? '',
        isUrgent: meetingData.isUrgent ?? false
      } as Parameters<typeof storage.createMeeting>[0]);
      res.status(201).json(meeting);
    } catch (error) {
      handleError(res, error, "Create meeting");
    }
  });

  /**
   * @swagger
   * /api/meetings/{id}:
   *   put:
   *     summary: Atualiza uma reunião
   *     tags: [Meetings]
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
   *     responses:
   *       200:
   *         description: Reunião atualizada
   *       404:
   *         description: Reunião não encontrada
   */
  app.put("/api/meetings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const meetingData = req.body;

      const meeting = await storage.updateMeeting(id, meetingData);

      if (!meeting) {
        res.status(404).json({ error: 'Reunião não encontrada' }); return;
      }

      res.json(meeting);
    } catch (error) {
      handleError(res, error, "Update meeting");
    }
  });

  /**
   * @swagger
   * /api/meeting-types:
   *   get:
   *     summary: Lista tipos de reunião
   *     tags: [Meetings, Settings]
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
