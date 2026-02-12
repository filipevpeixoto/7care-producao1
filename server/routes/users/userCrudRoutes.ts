/**
 * User CRUD Routes
 * Core CRUD operations + approval/rejection
 */

import { type Express, type Request, type Response } from 'express';
import { checkReadOnlyAccess } from '../../middleware';
import { type User } from '../../../shared/schema';
import { hasAdminAccess, isSuperAdmin } from '../../utils/permissions';
import * as bcrypt from 'bcryptjs';
import { validateBody, validateParams, type ValidatedRequest } from '../../middleware/validation';
import { createUserSchema, updateUserSchema, PROTECTED_USER_FIELDS } from '../../schemas';
import { idParamSchema } from '../../utils/paramValidation';
import { logger } from '../../utils/logger';
import { BCRYPT_SALT_ROUNDS } from '../../config/security';
import { cacheMiddleware, invalidateCacheMiddleware } from '../../middleware/cache';
import { CACHE_TTL } from '../../constants';
import { asyncHandler } from '../../utils';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../../utils/apiResponse';
import { getRepository, getService } from '../../container';
import { getAuthUserId, getAuthUserRole } from '../../utils/authHelpers';
import { redactUserPII } from './userHelpers';

export const userCrudRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const churchRepo = getRepository('churchRepository');
  const relationshipRepo = getRepository('relationshipRepository');
  const pointsCalcService = getService('pointsCalculationService');

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: Lista todos os usuários (com paginação)
   *     tags: [Users]
   *     parameters:
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *         description: Filtrar por role
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *         description: Filtrar por status
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Número da página (começa em 1)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 5000
   *         description: Limite de resultados por página (máximo 5000)
   *     responses:
   *       200:
   *         description: Lista paginada de usuários
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                     total:
   *                       type: integer
   *                     totalPages:
   *                       type: integer
   */
  app.get(
    '/api/users',
    cacheMiddleware('users', CACHE_TTL.USERS),
    asyncHandler(async (req: Request, res: Response) => {
      logger.debug('🔍 [GET /api/users] Iniciando busca de usuários');
      const { role, status, church, search } = req.query;

      // Paginação com limites sensatos (max 100, default 20)
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

      const requestingUserId = getAuthUserId(req);

      logger.debug('📋 Parâmetros:', {
        role,
        status,
        church,
        search,
        page,
        limit,
        requestingUserId,
      });

      // Buscar dados do usuário que está fazendo a requisição
      let requestingUser: User | null = null;
      if (requestingUserId) {
        requestingUser = await userRepo.getUserById(requestingUserId);
      }

      // === Missionary special path (needs in-memory processing for PII redaction) ===
      if (requestingUser && requestingUser.role === 'missionary') {
        let users = await userRepo.getAllUsers();

        if (role) users = users.filter((u) => u.role === role);
        if (status) users = users.filter((u) => u.status === status);
        if (church) {
          users = users.filter((u) => u.church === church);
        } else if (requestingUser.church) {
          users = users.filter((u) => u.church === requestingUser!.church);
        }

        const missionary = requestingUser;
        const churchInterested = users.filter(
          (u) =>
            u.role === 'interested' &&
            u.church === missionary.church &&
            u.churchCode === missionary.churchCode
        );

        const relationships = await relationshipRepo.getByMissionary(requestingUserId);
        const linkedInterestedIds = relationships.map((r) => r.interestedId);

        const processedUsers = churchInterested.map((user) => {
          const isLinked = linkedInterestedIds.includes(user.id);
          if (isLinked) return user;
          return redactUserPII(user);
        });

        const otherUsers = users.filter(
          (u) =>
            u.role !== 'interested' ||
            u.church !== missionary.church ||
            u.churchCode !== missionary.churchCode
        );

        const finalUsers = [...processedUsers, ...otherUsers];
        const offset = (page - 1) * limit;
        const paginatedUsers = finalUsers.slice(offset, offset + limit);
        const safeUsers = paginatedUsers.map(({ password: _password, ...user }) => user);

        sendSuccess(res, {
          data: safeUsers,
          pagination: {
            page,
            limit,
            total: finalUsers.length,
            totalPages: Math.ceil(finalUsers.length / limit),
          },
        });
        return;
      }

      // === Standard path — DB-level pagination (LIMIT/OFFSET + WHERE) ===
      // Determine filters to push to DB
      const filters: {
        page: number;
        limit: number;
        role?: string;
        status?: string;
        church?: string;
        districtId?: number;
        search?: string;
      } = { page, limit };

      if (role) filters.role = role as string;
      if (status) filters.status = status as string;
      if (search) filters.search = search as string;

      if (church) {
        filters.church = church as string;
      } else if (requestingUser && !isSuperAdmin(requestingUser)) {
        if (requestingUser.role === 'pastor' && requestingUser.districtId) {
          filters.districtId = requestingUser.districtId;
          logger.info(`🏛️ Pastor detectado, filtrando por distrito: ${requestingUser.districtId}`);
        } else if (requestingUser.church) {
          filters.church = requestingUser.church;
          logger.info(`⛪ Filtrando por igreja: ${requestingUser.church}`);
        }
      }

      const { data: users, total } = await userRepo.getUsersPaginated(filters);
      logger.debug(`✅ ${users.length} usuários retornados (total: ${total})`);

      // Calcular pontuação apenas para os usuários da página atual
      const pointsMap = await pointsCalcService.calculateUserPointsBatch(users);
      const usersWithPoints = users.map((user) => ({
        ...user,
        calculatedPoints: pointsMap.get(user.id) ?? 0,
      }));

      const totalPages = Math.ceil(total / limit);
      const safeUsers = usersWithPoints.map(({ password: _password, ...user }) => user);
      logger.debug(`📤 Enviando página ${page}/${totalPages} com ${safeUsers.length} usuários`);

      sendSuccess(res, {
        data: safeUsers,
        pagination: { page, limit, total, totalPages },
      });
    })
  );

  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     summary: Busca usuário por ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Dados do usuário
   *       404:
   *         description: Usuário não encontrado
   */
  app.get(
    '/api/users/:id(\\d+)',
    validateParams(idParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const user = await userRepo.getUserById(id);

      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      // Verificar permissões de acesso ao usuário
      const requestingUserId = getAuthUserId(req);

      // Requer autenticação para acessar dados de usuário
      if (!requestingUserId) {
        return res.status(401).json({
          error: 'Não autenticado',
          message: 'É necessário estar autenticado para acessar dados de usuários',
        });
      }

      const requestingUser = await userRepo.getUserById(requestingUserId);

      if (!requestingUser) {
        return res.status(401).json({
          error: 'Usuário não encontrado',
          message: 'Usuário da requisição não encontrado',
        });
      }

      // Usuário pode sempre ver seus próprios dados
      if (requestingUser.id !== user.id && !isSuperAdmin(requestingUser)) {
        // Se for pastor, verificar se o usuário pertence ao mesmo distrito
        if (requestingUser.role === 'pastor' && requestingUser.districtId) {
          if (user.districtId !== requestingUser.districtId) {
            logger.warn(
              `🚫 Pastor ${requestingUser.email} tentou acessar usuário de outro distrito`
            );
            return res.status(403).json({
              error: 'Acesso negado',
              message: 'Você não tem permissão para acessar usuários de outros distritos',
            });
          }
          // Se não for pastor/super admin, verificar se pertence à mesma igreja
        } else if (user.church !== requestingUser.church) {
          logger.warn(`🚫 Usuário ${requestingUser.email} tentou acessar usuário de outra igreja`);
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Você não tem permissão para acessar usuários de outras igrejas',
          });
        }
      }

      const { password: _password, ...safeUser } = user;
      sendSuccess(res, safeUser);
    })
  );

  /**
   * @swagger
   * /api/users:
   *   post:
   *     summary: Cria novo usuário
   *     tags: [Users]
   *     security:
   *       - userId: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/User'
   *     responses:
   *       201:
   *         description: Usuário criado
   */
  app.post(
    '/api/users',
    checkReadOnlyAccess,
    invalidateCacheMiddleware('users'),
    validateBody(createUserSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userData = (req as ValidatedRequest<typeof createUserSchema._type>).validatedBody;
      logger.info(`Criando novo usuário: ${userData.email}`);

      const { generateTemporaryPassword } = await import('../../config/security');
      const hashedPassword = userData.password
        ? await bcrypt.hash(userData.password, BCRYPT_SALT_ROUNDS)
        : await bcrypt.hash(generateTemporaryPassword(), BCRYPT_SALT_ROUNDS);

      if (userData.church && userData.church.trim() !== '') {
        try {
          await churchRepo.getOrCreateChurch(userData.church.trim());
        } catch (error) {
          logger.error(`Erro ao processar igreja "${userData.church}":`, error);
        }
      }

      const processedUserData = {
        ...userData,
        password: hashedPassword,
        firstAccess: true,
        status: 'pending',
        isApproved: userData.isApproved || false,
        role: userData.role || 'interested',
        points: 0,
        level: 'Bronze',
        attendance: 0,
      };

      const newUser = await userRepo.createUser({
        ...processedUserData,
        biblicalInstructor: processedUserData.biblicalInstructor ?? null,
      } as Parameters<typeof userRepo.createUser>[0]);

      sendCreated(res, newUser);
    })
  );

  /**
   * @swagger
   * /api/users/{id}:
   *   put:
   *     summary: Atualiza usuário
   *     tags: [Users]
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
   *             $ref: '#/components/schemas/User'
   *     responses:
   *       200:
   *         description: Usuário atualizado
   */
  app.put(
    '/api/users/:id(\\d+)',
    checkReadOnlyAccess,
    invalidateCacheMiddleware('users'),
    validateBody(updateUserSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const validatedData = (req as ValidatedRequest<typeof updateUserSchema._type>).validatedBody;

      // Proteger campos sensíveis: apenas superadmin pode alterar role/status/isApproved
      const requestingUserRole = getAuthUserRole(req);
      const updateData = { ...validatedData } as Record<string, unknown>;
      if (requestingUserRole !== 'superadmin') {
        for (const field of PROTECTED_USER_FIELDS) {
          delete updateData[field];
        }
      }

      if (updateData.biblicalInstructor !== undefined) {
        if (updateData.biblicalInstructor) {
          const existingRelationship = await relationshipRepo.getByInterested(id);
          if (!existingRelationship || existingRelationship.length === 0) {
            await relationshipRepo.create({
              missionaryId: parseInt(String(updateData.biblicalInstructor)),
              interestedId: id,
              status: 'active',
              notes: 'Vinculado pelo admin',
            });
          }
        }
      }

      const user = await userRepo.updateUser(id, updateData);
      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      const { password: _password2, ...safeUser } = user;
      sendSuccess(res, safeUser);
    })
  );

  /**
   * @swagger
   * /api/users/{id}:
   *   delete:
   *     summary: Remove usuário
   *     tags: [Users]
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
   *         description: Usuário removido
   */
  app.delete(
    '/api/users/:id(\\d+)',
    checkReadOnlyAccess,
    invalidateCacheMiddleware('users'),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);

      const user = await userRepo.getUserById(id);
      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      if (user.email === 'admin@7care.com') {
        return sendError(res, 'Não é possível excluir o Super Administrador do sistema', 403);
      }

      if (hasAdminAccess(user)) {
        return sendError(res, 'Não é possível excluir usuários administradores do sistema', 403);
      }

      const success = await userRepo.deleteUser(id);

      if (!success) {
        return sendNotFound(res, 'Usuário');
      }

      sendSuccess(res, { success: true });
    })
  );

  /**
   * @swagger
   * /api/users/{id}/approve:
   *   post:
   *     summary: Aprova usuário
   *     tags: [Users]
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
   *         description: Usuário aprovado
   */
  app.post(
    '/api/users/:id(\\d+)/approve',
    checkReadOnlyAccess,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const user = await userRepo.approveUser(id);

      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      const { password: _password3, ...safeUser } = user;
      sendSuccess(res, safeUser);
    })
  );

  /**
   * @swagger
   * /api/users/{id}/reject:
   *   post:
   *     summary: Rejeita usuário
   *     tags: [Users]
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
   *         description: Usuário rejeitado
   */
  app.post(
    '/api/users/:id(\\d+)/reject',
    checkReadOnlyAccess,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const user = await userRepo.rejectUser(id);

      if (!user) {
        return sendNotFound(res, 'Usuário');
      }

      const { password: _password4, ...safeUser } = user;
      sendSuccess(res, safeUser);
    })
  );
};
