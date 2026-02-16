/**
 * Debug Routes Module
 * Endpoints para debug e desenvolvimento (apenas em ambiente de desenvolvimento)
 */

import { type Express, type Request, type Response } from 'express';
import { getRepository } from '../container';
import { asyncHandler } from '../utils';
import { type User } from '../../shared/schema';
import { sendSuccess } from '../utils/apiResponse';

/** Registers debug routes (development environment only) */
export const debugRoutes = (app: Express): void => {
  // Só registra rotas de debug em ambiente de desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const userRepo = getRepository('userRepository');
  const eventRepo = getRepository('eventRepository');
  const churchRepo = getRepository('churchRepository');
  const notificationRepo = getRepository('notificationRepository');

  /**
   * @swagger
   * /api/debug/visited-users:
   *   get:
   *     summary: Lista usuários visitados (debug)
   *     tags: [Debug]
   *     responses:
   *       200:
   *         description: Lista de usuários visitados
   */
  app.get(
    '/api/debug/visited-users',
    asyncHandler(async (_req: Request, res: Response) => {
      const users = await userRepo.getAllUsers();
      const visitedUsers = users.filter(u => 'lastVisitDate' in u && u.lastVisitDate);

      sendSuccess(res, {
        total: users.length,
        visited: visitedUsers.length,
        users: visitedUsers.map(u => ({
          id: u.id,
          name: u.name,
          lastVisitDate: (u as User & { lastVisitDate?: string }).lastVisitDate,
        })),
      });
    })
  );

  /**
   * @swagger
   * /api/debug/events:
   *   get:
   *     summary: Lista eventos (debug)
   *     tags: [Debug]
   *     responses:
   *       200:
   *         description: Lista de eventos
   */
  app.get(
    '/api/debug/events',
    asyncHandler(async (_req: Request, res: Response) => {
      const events = await eventRepo.getAllEvents();
      sendSuccess(res, {
        total: events.length,
        events,
      });
    })
  );

  /**
   * @swagger
   * /api/debug/create-simple-event:
   *   get:
   *     summary: Cria evento de teste (debug)
   *     tags: [Debug]
   *     responses:
   *       200:
   *         description: Evento criado
   */
  app.get(
    '/api/debug/create-simple-event',
    asyncHandler(async (_req: Request, res: Response) => {
      const event = await eventRepo.createEvent({
        title: `Evento de Teste ${Date.now()}`,
        description: 'Evento criado para debug',
        date: new Date().toISOString(),
        time: '',
        location: '',
        type: 'teste',
        color: '#3b82f6',
        isRecurring: false,
        recurrencePattern: '',
        maxParticipants: 0,
        isPublic: true,
        organizerId: 1,
        church: '',
        churchId: 1,
      });

      sendSuccess(res, { event, message: 'Evento criado' });
    })
  );

  /**
   * @swagger
   * /api/debug/check-churches:
   *   get:
   *     summary: Verifica igrejas (debug)
   *     tags: [Debug]
   *     responses:
   *       200:
   *         description: Lista de igrejas
   */
  app.get(
    '/api/debug/check-churches',
    asyncHandler(async (_req: Request, res: Response) => {
      const churches = await churchRepo.getAllChurches();
      sendSuccess(res, {
        total: churches.length,
        churches,
      });
    })
  );

  /**
   * @swagger
   * /api/debug/check-users:
   *   get:
   *     summary: Verifica usuários (debug)
   *     tags: [Debug]
   *     responses:
   *       200:
   *         description: Resumo de usuários
   */
  app.get(
    '/api/debug/check-users',
    asyncHandler(async (_req: Request, res: Response) => {
      const users = await userRepo.getAllUsers();
      const roleCount: Record<string, number> = {};

      users.forEach((u: { role?: string }) => {
        const role = u.role || 'unknown';
        roleCount[role] = (roleCount[role] || 0) + 1;
      });

      sendSuccess(res, {
        total: users.length,
        byRole: roleCount,
      });
    })
  );

  /**
   * @swagger
   * /api/debug/check-events-db:
   *   get:
   *     summary: Verifica eventos no banco (debug)
   *     tags: [Debug]
   *     responses:
   *       200:
   *         description: Eventos do banco
   */
  app.get(
    '/api/debug/check-events-db',
    asyncHandler(async (_req: Request, res: Response) => {
      const events = await eventRepo.getAllEvents();
      const typeCount: Record<string, number> = {};

      events.forEach((e: { type?: string }) => {
        const type = e.type || 'unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      sendSuccess(res, {
        total: events.length,
        byType: typeCount,
      });
    })
  );

  /**
   * @swagger
   * /api/debug/notifications:
   *   get:
   *     summary: Verifica notificações (debug)
   *     tags: [Debug]
   *     responses:
   *       200:
   *         description: Resumo de notificações
   */
  app.get(
    '/api/debug/notifications',
    asyncHandler(async (_req: Request, res: Response) => {
      const notifications = await notificationRepo.getAll();

      const unread = notifications.filter((n: { isRead?: boolean }) => !n.isRead);
      const typeCount: Record<string, number> = {};

      notifications.forEach((n: { type?: string }) => {
        const type = n.type || 'unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      sendSuccess(res, {
        total: notifications.length,
        unread: unread.length,
        byType: typeCount,
      });
    })
  );

  /**
   * @swagger
   * /api/debug/clean-duplicates:
   *   post:
   *     summary: Remove eventos duplicados (debug)
   *     tags: [Debug]
   *     responses:
   *       200:
   *         description: Duplicados removidos
   */
  app.post(
    '/api/debug/clean-duplicates',
    asyncHandler(async (_req: Request, res: Response) => {
      const events = await eventRepo.getAllEvents();
      const seen = new Map<string, number>();
      const duplicateIds: number[] = [];

      events.forEach((e: { id: number; title?: string; date?: string }) => {
        const key = `${e.title}-${e.date}`;
        if (seen.has(key)) {
          duplicateIds.push(e.id);
        } else {
          seen.set(key, e.id);
        }
      });

      for (const id of duplicateIds) {
        await eventRepo.deleteEvent(id);
      }

      sendSuccess(res, { removed: duplicateIds.length, message: 'Duplicados removidos' });
    })
  );

  /**
   * @swagger
   * /api/system/check-missionary-profiles:
   *   post:
   *     summary: Verifica perfis de missionários (debug)
   *     tags: [Debug, System]
   *     responses:
   *       200:
   *         description: Perfis verificados
   */
  app.post(
    '/api/system/check-missionary-profiles',
    asyncHandler(async (_req: Request, res: Response) => {
      const users = await userRepo.getAllUsers();
      const missionaries = users.filter((u: { role?: string }) => u.role === 'missionary');

      sendSuccess(res, {
        total: missionaries.length,
        missionaries: missionaries.map(
          (m: { id: number; name: string; status?: string; isApproved?: boolean }) => ({
            id: m.id,
            name: m.name,
            status: m.status,
            isApproved: m.isApproved,
          })
        ),
      });
    })
  );

  /**
   * @swagger
   * /api/setup/test-data:
   *   get:
   *     summary: Verifica dados de teste (debug)
   *     tags: [Debug, Setup]
   *     responses:
   *       200:
   *         description: Dados de teste
   */
  app.get(
    '/api/setup/test-data',
    asyncHandler(async (_req: Request, res: Response) => {
      const users = await userRepo.getAllUsers();
      const churches = await churchRepo.getAllChurches();
      const events = await eventRepo.getAllEvents();

      sendSuccess(res, {
        users: users.length,
        churches: churches.length,
        events: events.length,
        hasData: users.length > 0 || churches.length > 0 || events.length > 0,
      });
    })
  );
};
