/**
 * Meeting Routes Module
 * Endpoints relacionados a reuniões e agendamentos
 */

import { type Express, type Request, type Response } from 'express';
import { getRepository } from '../container';
import { asyncHandler, sendSuccess, sendNotFound } from '../utils';
import { logger } from '../utils/logger';
import { validateBody, type ValidatedRequest } from '../middleware/validation';
import { createMeetingSchema } from '../schemas';
import { isPastor } from '../utils/permissions';
import { type User } from '../../shared/schema';
import { getAuthUserId } from '../utils/authHelpers';

/** Registers meeting and scheduling routes */
export const meetingRoutes = (app: Express): void => {
  const meetingRepo = getRepository('meetingRepository');
  const userRepo = getRepository('userRepository');

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
  app.get(
    '/api/meetings',
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, status } = req.query;
      const requestingUserId = getAuthUserId(req);
      const requestingUser = requestingUserId ? await userRepo.getUserById(requestingUserId) : null;

      let meetings = await meetingRepo.getAll();

      // Filtrar por distrito se for pastor - usando query eficiente
      if (isPastor(requestingUser) && requestingUser?.districtId) {
        const districtUsers = await userRepo.getUsersByDistrictId(requestingUser.districtId);
        const districtUserIds = new Set(districtUsers.map((u: User) => u.id));

        meetings = meetings.filter(
          (m) =>
            (m.requesterId && districtUserIds.has(m.requesterId)) ||
            (m.assignedToId && districtUserIds.has(m.assignedToId))
        );
        logger.info(
          `🏛️ Reuniões filtradas por distrito ${requestingUser.districtId}: ${meetings.length} encontradas`
        );
      }

      if (userId) {
        const id = parseInt(String(userId), 10);
        meetings = meetings.filter((m) => m.requesterId === id || m.assignedToId === id);
      }

      if (status) {
        meetings = meetings.filter((m) => m.status === status);
      }

      sendSuccess(res, meetings);
    })
  );

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
  app.post(
    '/api/meetings',
    validateBody(createMeetingSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const meetingData = (req as ValidatedRequest<typeof createMeetingSchema._type>).validatedBody;
      logger.info(`Creating meeting: ${meetingData.title}`);
      const meeting = await meetingRepo.create({
        ...meetingData,
        notes: meetingData.notes ?? '',
        isUrgent: meetingData.isUrgent ?? false,
      } as Parameters<typeof meetingRepo.create>[0]);
      sendSuccess(res, meeting, 201);
    })
  );

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
  app.put(
    '/api/meetings/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const meetingData = req.body;

      const meeting = await meetingRepo.update(id, meetingData);

      if (!meeting) {
        sendNotFound(res, 'Reunião');
        return;
      }

      sendSuccess(res, meeting);
    })
  );

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
  app.get(
    '/api/meeting-types',
    asyncHandler(async (_req: Request, res: Response) => {
      const meetingTypes = await meetingRepo.getMeetingTypes();
      sendSuccess(res, meetingTypes);
    })
  );
};
