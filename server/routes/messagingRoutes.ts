/**
 * Messaging Routes Module
 * Endpoints relacionados a mensagens e conversas
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createMessageSchema } from '../schemas';
import { asyncHandler, sendError } from '../utils';

export const messagingRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

  /**
   * @swagger
   * /api/conversations/{userId}:
   *   get:
   *     summary: Lista conversas de um usuário
   *     tags: [Messages]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Lista de conversas
   */
  app.get(
    '/api/conversations/:userId',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = parseInt(req.params.userId);
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    })
  );

  /**
   * @swagger
   * /api/conversations/direct:
   *   post:
   *     summary: Cria ou obtém conversa direta
   *     tags: [Messages]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId1
   *               - userId2
   *             properties:
   *               userId1:
   *                 type: integer
   *               userId2:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Conversa criada ou existente
   */
  app.post(
    '/api/conversations/direct',
    asyncHandler(async (req: Request, res: Response) => {
      const { userId1, userId2 } = req.body;

      if (!userId1 || !userId2) {
        return sendError(res, 'IDs dos usuários são obrigatórios', 400);
      }

      const conversation = await storage.getOrCreateDirectConversation(userId1, userId2);
      res.json(conversation);
    })
  );

  /**
   * @swagger
   * /api/conversations/{id}/messages:
   *   get:
   *     summary: Lista mensagens de uma conversa
   *     tags: [Messages]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *     responses:
   *       200:
   *         description: Lista de mensagens
   */
  app.get(
    '/api/conversations/:id/messages',
    asyncHandler(async (req: Request, res: Response) => {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    })
  );

  /**
   * @swagger
   * /api/messages:
   *   post:
   *     summary: Envia uma mensagem
   *     tags: [Messages]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - conversationId
   *               - senderId
   *               - content
   *             properties:
   *               conversationId:
   *                 type: integer
   *               senderId:
   *                 type: integer
   *               content:
   *                 type: string
   *               messageType:
   *                 type: string
   *                 enum: [text, image, file, system]
   *                 default: text
   *     responses:
   *       201:
   *         description: Mensagem enviada
   */
  app.post(
    '/api/messages',
    validateBody(createMessageSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const messageData = (req as ValidatedRequest<typeof createMessageSchema._type>).validatedBody;
      logger.info(`New message in conversation ${messageData.conversationId}`);
      const message = await storage.createMessage({
        ...messageData,
        isRead: false,
      } as Parameters<typeof storage.createMessage>[0]);
      res.status(201).json(message);
    })
  );
};
