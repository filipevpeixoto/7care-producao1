/**
 * Discipleship Routes Module
 * Endpoints relacionados a pedidos de discipulado
 */

import { type Express, type Request, type Response } from 'express';
import { logger } from '../utils/logger';
import { validateBody, type ValidatedRequest } from '../middleware/validation';
import { createDiscipleshipRequestSchema } from '../schemas';
import { hasAdminAccess } from '../utils/permissions';
import { asyncHandler } from '../utils';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/apiResponse';
import { getRepository } from '../container';
import { getAuthUserId, getAuthUserRole } from '../utils/authHelpers';

const parseDistrictScope = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/** Registers discipleship request routes */
export const discipleshipRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const discipleshipRepo = getRepository('discipleshipRepository');
  const relationshipRepo = getRepository('relationshipRepository');

  /**
   * @swagger
   * /api/discipleship-requests:
   *   get:
   *     summary: Lista pedidos de discipulado
   *     tags: [Discipleship]
   *     parameters:
   *       - in: query
   *         name: missionaryId
   *         schema:
   *           type: integer
   *         description: Filtrar por missionário
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, approved, rejected]
   *         description: Filtrar por status
   *     responses:
   *       200:
   *         description: Lista de pedidos
   */
  app.get(
    '/api/discipleship-requests',
    asyncHandler(async (req: Request, res: Response) => {
      const { missionaryId, status } = req.query;
      const userId = String(getAuthUserId(req));
      const requestedDistrictScope = parseDistrictScope(req.query.districtId);
      const userRole = getAuthUserRole(req) as
        | 'superadmin'
        | 'pastor'
        | 'member'
        | 'interested'
        | 'missionary'
        | 'admin_readonly'
        | undefined;

      let userChurch: string | null = null;
      let userDistrict: number | null = null;
      let isPastor = false;
      let isScopedSuperadmin = false;

      const userIdNum = userId ? parseInt(userId) : null;
      const currentUser = userIdNum ? await userRepo.getUserById(userIdNum) : null;

      if (currentUser?.role === 'pastor' && currentUser.districtId) {
        userDistrict = currentUser.districtId;
        isPastor = true;
        logger.debug(
          `🏛️ Pastor detectado em discipleship-requests, filtrando por distrito: ${userDistrict}`
        );
      } else if (currentUser?.role === 'superadmin' && requestedDistrictScope) {
        userDistrict = requestedDistrictScope;
        isPastor = true;
        isScopedSuperadmin = true;
      }

      // Se não for admin, filtrar por igreja do usuário
      if (!hasAdminAccess({ role: userRole }) && userId) {
        if (currentUser) {
          if (currentUser.church) {
            userChurch = currentUser.church;
          }
        }
      }

      if (isScopedSuperadmin) {
        logger.debug(
          `🏛️ Superadmin com escopo de distrito em discipleship-requests: ${userDistrict}`
        );
      }

      let requests = await discipleshipRepo.getAll();

      if (missionaryId) {
        const id = parseInt(missionaryId as string);
        requests = requests.filter((r: { missionaryId?: number }) => r.missionaryId === id);
      }

      if (status) {
        requests = requests.filter((r: { status?: string }) => r.status === status);
      }

      // Enriquecer com dados dos usuários
      const enrichedRequests = await Promise.all(
        requests.map(async (req: { interestedId?: number; missionaryId?: number }) => {
          const interested = req.interestedId ? await userRepo.getUserById(req.interestedId) : null;
          const missionary = req.missionaryId ? await userRepo.getUserById(req.missionaryId) : null;

          return {
            ...req,
            interestedName: interested?.name || 'Desconhecido',
            missionaryName: missionary?.name || 'Desconhecido',
            interestedChurch: interested?.church || null,
            missionaryChurch: missionary?.church || null,
            interestedDistrict: interested?.districtId || null,
            missionaryDistrict: missionary?.districtId || null,
          };
        })
      );

      // Filtrar por distrito (pastor) ou por igreja (outros usuários)
      let filteredRequests = enrichedRequests;
      if (isPastor && userDistrict !== null) {
        // Para pastores, filtrar por distrito
        filteredRequests = enrichedRequests.filter(
          (req: unknown) =>
            (req as { interestedDistrict?: number | null; missionaryDistrict?: number | null })
              .interestedDistrict === userDistrict ||
            (req as { interestedDistrict?: number | null; missionaryDistrict?: number | null })
              .missionaryDistrict === userDistrict
        );
      } else if (userChurch) {
        // Para outros usuários, filtrar por igreja
        filteredRequests = enrichedRequests.filter(
          (req: unknown) =>
            (req as { interestedChurch?: string; missionaryChurch?: string }).interestedChurch ===
              userChurch ||
            (req as { interestedChurch?: string; missionaryChurch?: string }).missionaryChurch ===
              userChurch
        );
      }

      sendSuccess(res, filteredRequests);
    })
  );

  /**
   * @swagger
   * /api/discipleship-requests:
   *   post:
   *     summary: Cria pedido de discipulado
   *     tags: [Discipleship]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - interestedId
   *               - missionaryId
   *             properties:
   *               interestedId:
   *                 type: integer
   *               missionaryId:
   *                 type: integer
   *               notes:
   *                 type: string
   *     responses:
   *       201:
   *         description: Pedido criado
   *       400:
   *         description: Dados inválidos ou pedido já existe
   */
  app.post(
    '/api/discipleship-requests',
    validateBody(createDiscipleshipRequestSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { interestedId, missionaryId, notes } = (
        req as ValidatedRequest<typeof createDiscipleshipRequestSchema._type>
      ).validatedBody;
      const requestingUserId = getAuthUserId(req);
      if (!requestingUserId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const requestingUser = await userRepo.getUserById(requestingUserId);
      if (!requestingUser) {
        return sendError(res, 'Usuário não encontrado', 401);
      }

      logger.info(
        `Creating discipleship request: missionary ${missionaryId} -> interested ${interestedId}`
      );

      // Validar que ambos pertencem à mesma igreja
      const interested = await userRepo.getUserById(interestedId);
      const missionary = await userRepo.getUserById(missionaryId);

      if (!interested) {
        return sendNotFound(res, 'Interessado');
      }
      if (!missionary) {
        return sendNotFound(res, 'Discipulador');
      }

      if (!hasAdminAccess(requestingUser)) {
        if (requestingUser.id !== missionaryId) {
          return sendError(res, 'Você só pode criar pedidos para si mesmo', 403);
        }
      }

      if (requestingUser.role === 'pastor' && requestingUser.districtId) {
        const sameDistrict =
          interested.districtId === requestingUser.districtId &&
          missionary.districtId === requestingUser.districtId;
        if (!sameDistrict) {
          return sendError(
            res,
            'Pastor só pode criar pedidos para usuários do próprio distrito',
            403
          );
        }
      }

      // Verificar se pertencem à mesma igreja (apenas se ambos tiverem igreja definida)
      if (interested.church && missionary.church && interested.church !== missionary.church) {
        return sendError(res, 'Discipulado só pode acontecer entre membros da mesma igreja', 400);
      }

      // Verificar se já existe um pedido pendente
      const existingRequests = await discipleshipRepo.getAll();
      const hasPending = existingRequests.some(
        (r: { interestedId?: number; missionaryId?: number; status?: string }) =>
          r.interestedId === interestedId &&
          r.missionaryId === missionaryId &&
          r.status === 'pending'
      );

      if (hasPending) {
        return sendError(res, 'Já existe um pedido pendente para este interessado', 400);
      }

      const request = await discipleshipRepo.create({
        interestedId,
        missionaryId,
        status: 'pending',
        notes: notes ?? undefined,
      });

      sendCreated(res, request);
    })
  );

  /**
   * @swagger
   * /api/discipleship-requests/{id}:
   *   put:
   *     summary: Atualiza pedido de discipulado
   *     tags: [Discipleship]
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
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [pending, approved, rejected]
   *               notes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Pedido atualizado
   *       404:
   *         description: Pedido não encontrado
   */
  app.put(
    '/api/discipleship-requests/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;

      const requestingUserId = getAuthUserId(req);
      if (!requestingUserId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const requestingUser = await userRepo.getUserById(requestingUserId);
      if (!requestingUser) {
        return sendError(res, 'Usuário não encontrado', 401);
      }

      const existingRequest = await discipleshipRepo.getById(id);
      if (!existingRequest) {
        return sendNotFound(res, 'Pedido');
      }

      const missionary = existingRequest.missionaryId
        ? await userRepo.getUserById(existingRequest.missionaryId)
        : null;
      const interested = existingRequest.interestedId
        ? await userRepo.getUserById(existingRequest.interestedId)
        : null;

      if (!hasAdminAccess(requestingUser)) {
        const canManageOwnRequest = existingRequest.missionaryId === requestingUser.id;
        if (!canManageOwnRequest) {
          return sendError(res, 'Você só pode atualizar seus próprios pedidos', 403);
        }
      }

      if (requestingUser.role === 'pastor' && requestingUser.districtId) {
        const sameDistrict =
          interested?.districtId === requestingUser.districtId ||
          missionary?.districtId === requestingUser.districtId;
        if (!sameDistrict) {
          return sendError(res, 'Pastor só pode atualizar pedidos do próprio distrito', 403);
        }
      }

      const request = await discipleshipRepo.update(id, { status, notes });

      if (!request) {
        return sendNotFound(res, 'Pedido');
      }

      // Se aprovado, criar relacionamento
      if (status === 'approved' && request.interestedId && request.missionaryId) {
        await relationshipRepo.create({
          interestedId: request.interestedId,
          missionaryId: request.missionaryId,
          status: 'active',
          notes: `Vínculo criado a partir do pedido de discipulado #${id}`,
        });
      }

      sendSuccess(res, request);
    })
  );

  /**
   * @swagger
   * /api/discipleship-requests/{id}:
   *   delete:
   *     summary: Remove pedido de discipulado
   *     tags: [Discipleship]
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
   *         description: Pedido removido
   */
  app.delete(
    '/api/discipleship-requests/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);

      const requestingUserId = getAuthUserId(req);
      if (!requestingUserId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const requestingUser = await userRepo.getUserById(requestingUserId);
      if (!requestingUser) {
        return sendError(res, 'Usuário não encontrado', 401);
      }

      const existingRequest = await discipleshipRepo.getById(id);
      if (!existingRequest) {
        return sendNotFound(res, 'Pedido');
      }

      const missionary = existingRequest.missionaryId
        ? await userRepo.getUserById(existingRequest.missionaryId)
        : null;
      const interested = existingRequest.interestedId
        ? await userRepo.getUserById(existingRequest.interestedId)
        : null;

      if (!hasAdminAccess(requestingUser)) {
        const canDeleteOwnRequest = existingRequest.missionaryId === requestingUser.id;
        if (!canDeleteOwnRequest) {
          return sendError(res, 'Você só pode remover seus próprios pedidos', 403);
        }
      }

      if (requestingUser.role === 'pastor' && requestingUser.districtId) {
        const sameDistrict =
          interested?.districtId === requestingUser.districtId ||
          missionary?.districtId === requestingUser.districtId;
        if (!sameDistrict) {
          return sendError(res, 'Pastor só pode remover pedidos do próprio distrito', 403);
        }
      }

      await discipleshipRepo.delete(id);
      sendSuccess(res, { message: 'Pedido removido' });
    })
  );

  /**
   * @swagger
   * /api/users/{id}/disciple:
   *   post:
   *     summary: Cria vínculo de discipulado direto
   *     tags: [Discipleship, Users]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID do interessado
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - missionaryId
   *             properties:
   *               missionaryId:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Vínculo criado
   */
  app.post(
    '/api/users/:id(\\d+)/disciple',
    asyncHandler(async (req: Request, res: Response) => {
      const interestedId = parseInt(req.params.id);
      const { missionaryId } = req.body;

      const requestingUserId = getAuthUserId(req);
      if (!requestingUserId) {
        return sendError(res, 'Usuário não autenticado', 401);
      }

      const requestingUser = await userRepo.getUserById(requestingUserId);
      if (!requestingUser) {
        return sendError(res, 'Usuário não encontrado', 401);
      }

      if (!missionaryId) {
        return sendError(res, 'ID do missionário é obrigatório', 400);
      }

      const interested = await userRepo.getUserById(interestedId);
      const missionary = await userRepo.getUserById(missionaryId);

      if (!interested) {
        return sendNotFound(res, 'Interessado');
      }

      if (!missionary) {
        return sendNotFound(res, 'Missionário');
      }

      if (!hasAdminAccess(requestingUser) && requestingUser.id !== missionaryId) {
        return sendError(res, 'Você só pode vincular interessados para si mesmo', 403);
      }

      if (requestingUser.role === 'pastor' && requestingUser.districtId) {
        const sameDistrict =
          interested.districtId === requestingUser.districtId &&
          missionary.districtId === requestingUser.districtId;
        if (!sameDistrict) {
          return sendError(
            res,
            'Pastor só pode criar vínculos com usuários do próprio distrito',
            403
          );
        }
      }

      // Verificar se já existe relacionamento ativo
      const existingRelationships = await relationshipRepo.getByInterested(interestedId);
      const hasActive = existingRelationships.some(
        (r: { status?: string }) => r.status === 'active'
      );

      if (hasActive) {
        return sendError(res, 'Interessado já possui um missionário vinculado', 400);
      }

      const relationship = await relationshipRepo.create({
        interestedId,
        missionaryId,
        status: 'active',
        notes: 'Vínculo criado diretamente',
      });

      sendCreated(res, relationship);
    })
  );
};
