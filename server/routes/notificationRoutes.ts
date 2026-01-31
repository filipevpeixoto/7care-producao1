/**
 * Notification Routes Module
 * Endpoints relacionados a notificações e push notifications
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { asyncHandler, sendSuccess, sendNotFound, sendError } from '../utils';

export const notificationRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

  /**
   * @swagger
   * /api/notifications/{userId}:
   *   get:
   *     summary: Lista notificações de um usuário
   *     tags: [Notifications]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *       - in: query
   *         name: unreadOnly
   *         schema:
   *           type: boolean
   *         description: Retornar apenas não lidas
   *     responses:
   *       200:
   *         description: Lista de notificações
   */
  app.get(
    '/api/notifications/:userId',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = parseInt(req.params.userId);
      const { unreadOnly } = req.query;

      let notifications = await storage.getNotificationsByUser(userId);

      if (unreadOnly === 'true') {
        notifications = notifications.filter((n: { isRead?: boolean }) => !n.isRead);
      }

      sendSuccess(res, notifications);
    })
  );

  /**
   * @swagger
   * /api/notifications/{id}/read:
   *   put:
   *     summary: Marca notificação como lida
   *     tags: [Notifications]
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
   *         description: Notificação marcada como lida
   */
  app.put(
    '/api/notifications/:id/read',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(id);

      if (!notification) {
        sendNotFound(res, 'Notificação');
        return;
      }

      sendSuccess(res, notification);
    })
  );

  /**
   * @swagger
   * /api/push/subscriptions:
   *   get:
   *     summary: Lista inscrições push do usuário
   *     tags: [Notifications, Push]
   *     parameters:
   *       - in: query
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Lista de inscrições push
   */
  app.get(
    '/api/push/subscriptions',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;

      // Se não houver userId, retorna array vazio (evita erro 400)
      // Isso permite que o frontend carregue sem erros quando o usuário não está logado
      if (!userId || isNaN(userId)) {
        sendSuccess(res, []);
        return;
      }

      const subscriptions = await storage.getPushSubscriptionsByUser(userId);
      sendSuccess(res, subscriptions);
    })
  );

  /**
   * @swagger
   * /api/push/subscribe:
   *   post:
   *     summary: Inscreve usuário para push notifications
   *     tags: [Notifications, Push]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - subscription
   *             properties:
   *               userId:
   *                 type: integer
   *               subscription:
   *                 type: object
   *               deviceName:
   *                 type: string
   *     responses:
   *       201:
   *         description: Inscrição criada
   */
  app.post(
    '/api/push/subscribe',
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, subscription, deviceName } = req.body;

      if (!userId || !subscription) {
        sendError(res, 'Dados de inscrição são obrigatórios', 400);
        return;
      }

      const subscriptionPayload =
        typeof subscription === 'string' ? JSON.parse(subscription) : subscription;

      const pushSubscription = await storage.createPushSubscription({
        userId,
        subscription: subscriptionPayload,
        deviceName: deviceName || 'Dispositivo desconhecido',
        isActive: true,
      });

      sendSuccess(res, pushSubscription, 201);
    })
  );

  /**
   * @swagger
   * /api/push/subscriptions/{id}/toggle:
   *   patch:
   *     summary: Ativa/desativa inscrição push
   *     tags: [Notifications, Push]
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
   *         description: Inscrição atualizada
   */
  app.patch(
    '/api/push/subscriptions/:id/toggle',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const subscription = await storage.togglePushSubscription(id);

      if (!subscription) {
        sendNotFound(res, 'Inscrição');
        return;
      }

      sendSuccess(res, subscription);
    })
  );

  /**
   * @swagger
   * /api/push/subscriptions/{id}:
   *   delete:
   *     summary: Remove inscrição push
   *     tags: [Notifications, Push]
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
   *         description: Inscrição removida
   */
  app.delete(
    '/api/push/subscriptions/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      await storage.deletePushSubscription(id);
      sendSuccess(res, { message: 'Inscrição removida' });
    })
  );

  /**
   * @swagger
   * /api/push/send:
   *   post:
   *     summary: Envia push notification
   *     tags: [Notifications, Push]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userIds
   *               - title
   *               - body
   *             properties:
   *               userIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *               title:
   *                 type: string
   *               body:
   *                 type: string
   *               icon:
   *                 type: string
   *               url:
   *                 type: string
   *     responses:
   *       200:
   *         description: Notificações enviadas
   */
  app.post(
    '/api/push/send',
    asyncHandler(async (req: Request, res: Response) => {
      const { userIds, title, body, icon, url } = req.body;

      if (!userIds || !title || !body) {
        sendError(res, 'Dados da notificação são obrigatórios', 400);
        return;
      }

      const results = await storage.sendPushNotifications({
        userIds,
        title,
        body,
        icon,
        url,
      });

      sendSuccess(res, { results });
    })
  );
};
