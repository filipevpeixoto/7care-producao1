/**
 * Notification Routes Module
 * Endpoints relacionados a notificações e push notifications
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { handleError } from '../utils/errorHandler';

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
  app.get('/api/notifications/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { unreadOnly } = req.query;

      let notifications = await storage.getNotificationsByUser(userId);

      if (unreadOnly === 'true') {
        notifications = notifications.filter((n: { isRead?: boolean }) => !n.isRead);
      }

      res.json(notifications);
    } catch (error) {
      handleError(res, error, 'Get notifications');
    }
  });

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
  app.put('/api/notifications/:id/read', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(id);

      if (!notification) {
        res.status(404).json({ error: 'Notificação não encontrada' });
        return;
      }

      res.json(notification);
    } catch (error) {
      handleError(res, error, 'Mark notification as read');
    }
  });

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
  app.get('/api/push/subscriptions', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;

      // Se não houver userId, retorna array vazio (evita erro 400)
      // Isso permite que o frontend carregue sem erros quando o usuário não está logado
      if (!userId || isNaN(userId)) {
        res.json([]);
        return;
      }

      const subscriptions = await storage.getPushSubscriptionsByUser(userId);
      res.json(subscriptions);
    } catch (error) {
      handleError(res, error, 'Get push subscriptions');
    }
  });

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
  app.post('/api/push/subscribe', async (req: Request, res: Response) => {
    try {
      const { userId, subscription, deviceName } = req.body;

      if (!userId || !subscription) {
        res.status(400).json({ error: 'Dados de inscrição são obrigatórios' });
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

      res.status(201).json(pushSubscription);
    } catch (error) {
      handleError(res, error, 'Create push subscription');
    }
  });

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
  app.patch('/api/push/subscriptions/:id/toggle', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const subscription = await storage.togglePushSubscription(id);

      if (!subscription) {
        res.status(404).json({ error: 'Inscrição não encontrada' });
        return;
      }

      res.json(subscription);
    } catch (error) {
      handleError(res, error, 'Toggle push subscription');
    }
  });

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
  app.delete('/api/push/subscriptions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePushSubscription(id);
      res.json({ success: true, message: 'Inscrição removida' });
    } catch (error) {
      handleError(res, error, 'Delete push subscription');
    }
  });

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
  app.post('/api/push/send', async (req: Request, res: Response) => {
    try {
      const { userIds, title, body, icon, url } = req.body;

      if (!userIds || !title || !body) {
        res.status(400).json({ error: 'Dados da notificação são obrigatórios' });
        return;
      }

      const results = await storage.sendPushNotifications({
        userIds,
        title,
        body,
        icon,
        url,
      });

      res.json({ success: true, results });
    } catch (error) {
      handleError(res, error, 'Send push notification');
    }
  });
};
