/**
 * Messaging Routes Module
 * Endpoints relacionados a mensagens e conversas
 */

import { Express, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createMessageSchema } from '../schemas';
import { asyncHandler } from '../utils';
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse';
import { getRepository } from '../container';

export const messagingRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const messageRepo = getRepository('messageRepository');
  const conversationRepo = getRepository('conversationRepository');

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
      const conversations = await conversationRepo.getByUserId(userId);

      // Enriquecer conversas com participantes e última mensagem
      const enrichedConversations = await Promise.all(
        conversations.map(async conv => {
          // Buscar participantes
          const participants = await conversationRepo.getParticipants(conv.id);

          // Buscar última mensagem
          const messages = await messageRepo.getByConversationId(conv.id);
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

          // Para conversas diretas, usar o nome do outro participante
          let name = conv.title || 'Conversa';
          if (conv.type === 'direct' || conv.type === 'private') {
            const otherParticipant = participants.find(p => p.userId !== userId);
            if (otherParticipant) {
              const otherUser = await userRepo.getUserById(otherParticipant.userId);
              name = otherUser?.name || 'Usuário';
            }
          }

          return {
            id: conv.id,
            type: conv.type === 'private' ? 'direct' : conv.type || 'direct',
            name,
            avatar: undefined,
            participants: participants.map(p => ({
              id: p.userId,
              name: p.userName || 'Usuário',
              role: 'user',
              isOnline: false,
            })),
            lastMessage: lastMessage
              ? {
                  content: lastMessage.content || '',
                  timestamp: lastMessage.createdAt || new Date().toISOString(),
                  senderId: lastMessage.senderId || 0,
                  senderName: '',
                }
              : {
                  content: '',
                  timestamp: conv.createdAt || new Date().toISOString(),
                  senderId: 0,
                  senderName: '',
                },
            unreadCount: 0,
            isPinned: false,
            isArchived: false,
          };
        })
      );

      sendSuccess(res, enrichedConversations);
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

      const conversation = await conversationRepo.getOrCreateDirect(userId1, userId2);
      sendSuccess(res, conversation);
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
      const messages = await messageRepo.getByConversationId(conversationId);
      sendSuccess(res, messages);
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
      const message = await messageRepo.create({
        ...messageData,
        isRead: false,
      } as Parameters<typeof messageRepo.create>[0]);
      sendCreated(res, message);
    })
  );
};
