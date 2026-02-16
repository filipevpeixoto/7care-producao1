/**
 * Relationship Routes Module
 * Endpoints relacionados a vínculos entre missionários e interessados
 */

import { type Express, type Request, type Response } from 'express';
import { getRepository } from '../container';
import { logger } from '../utils/logger';
import { validateBody, type ValidatedRequest } from '../middleware/validation';
import { createRelationshipSchema } from '../schemas';
import { hasAdminAccess, isSuperAdmin } from '../utils/permissions';
import { asyncHandler, sendSuccess, sendError, sendNotFound } from '../utils';
import { getAuthUserId, getAuthUserRole } from '../utils/authHelpers';

/** Registers missionary-interested relationship routes */
export const relationshipRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');
  const relationshipRepo = getRepository('relationshipRepository');

  /**
   * @swagger
   * /api/relationships:
   *   get:
   *     summary: Lista todos os relacionamentos
   *     tags: [Relationships]
   *     responses:
   *       200:
   *         description: Lista de relacionamentos
   */
  app.get(
    '/api/relationships',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = String(getAuthUserId(req));
      const userRole = getAuthUserRole(req) as
        | 'superadmin'
        | 'pastor'
        | 'member'
        | 'interested'
        | 'missionary'
        | 'admin_readonly'
        | undefined;
      const missionaryIdFilter = req.query.missionaryId as string;

      let userChurch: string | null = null;
      let userDistrictId: number | null = null;
      const userIdNum = userId ? parseInt(userId) : null;

      // Se não for admin, filtrar por distrito/igreja do usuário
      if (!hasAdminAccess({ role: userRole }) && userId) {
        const currentUser = await userRepo.getUserById(parseInt(userId));
        if (currentUser) {
          userChurch = currentUser.church || null;
          userDistrictId = currentUser.districtId || null;

          // Log para debug
          logger.info(
            `🔍 Usuário ${currentUser.name} (${currentUser.role}): distrito ${userDistrictId}, igreja ${userChurch}`
          );
        }
      }

      const relationships = await relationshipRepo.getAll();

      // PERFORMANCE: Batch-fetch de usuários (evita N+1 queries)
      const userIds = new Set<number>();
      for (const rel of relationships as { interestedId?: number; missionaryId?: number }[]) {
        if (rel.interestedId) userIds.add(rel.interestedId);
        if (rel.missionaryId) userIds.add(rel.missionaryId);
      }
      const userMap = await userRepo.getUsersByIds(Array.from(userIds));

      const enrichedRelationships = (
        relationships as { interestedId?: number; missionaryId?: number }[]
      ).map((rel) => {
        const interested = rel.interestedId ? userMap.get(rel.interestedId) ?? null : null;
        const missionary = rel.missionaryId ? userMap.get(rel.missionaryId) ?? null : null;

        return {
          ...rel,
          interestedName: interested?.name || 'Desconhecido',
          missionaryName: missionary?.name || 'Desconhecido',
          interestedChurch: interested?.church || null,
          missionaryChurch: missionary?.church || null,
          interestedDistrictId: interested?.districtId || null,
          missionaryDistrictId: missionary?.districtId || null,
        };
      });

      // Filtrar por distrito se for pastor (não superadmin)
      let filteredRelationships = enrichedRelationships;
      if (userRole === 'pastor' && userDistrictId && !isSuperAdmin({ role: userRole })) {
        logger.info(
          `🏛️ Pastor detectado, filtrando ${enrichedRelationships.length} relationships por distrito: ${userDistrictId}`
        );
        const beforeCount = enrichedRelationships.length;

        filteredRelationships = enrichedRelationships.filter((rel: unknown) => {
          const r = rel as {
            interestedDistrictId?: number | null;
            missionaryDistrictId?: number | null;
          };
          // Incluir relacionamentos onde interessado OU missionário pertencem ao distrito do pastor
          return (
            r.interestedDistrictId === userDistrictId || r.missionaryDistrictId === userDistrictId
          );
        });

        logger.info(
          `✅ Após filtro de distrito: ${filteredRelationships.length} relationships (removidos: ${beforeCount - filteredRelationships.length})`
        );
      }
      // Se não for pastor, filtrar por igreja se não for admin
      // MAS: sempre permitir que o usuário veja seus PRÓPRIOS relacionamentos (como missionário)
      else if (userChurch && userIdNum) {
        filteredRelationships = enrichedRelationships.filter((rel: unknown) => {
          const r = rel as {
            missionaryId?: number;
            interestedChurch?: string;
            missionaryChurch?: string;
          };
          // O usuário é o missionário deste relacionamento
          return (
            r.missionaryId === userIdNum ||
            // OU o relacionamento envolve sua igreja
            r.interestedChurch === userChurch ||
            r.missionaryChurch === userChurch
          );
        });
      }

      // Aplicar filtro de missionaryId se especificado na query
      if (missionaryIdFilter) {
        filteredRelationships = filteredRelationships.filter(
          (rel: unknown) =>
            (rel as { missionaryId?: number }).missionaryId === parseInt(missionaryIdFilter)
        );
      }

      sendSuccess(res, filteredRelationships);
    })
  );

  /**
   * @swagger
   * /api/relationships:
   *   post:
   *     summary: Cria um novo relacionamento
   *     tags: [Relationships]
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
   *               status:
   *                 type: string
   *                 enum: [active, pending, inactive]
   *               notes:
   *                 type: string
   *     responses:
   *       201:
   *         description: Relacionamento criado
   *       400:
   *         description: Dados inválidos
   */
  app.post(
    '/api/relationships',
    validateBody(createRelationshipSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { interestedId, missionaryId, status, notes } = (
        req as ValidatedRequest<typeof createRelationshipSchema._type>
      ).validatedBody;
      logger.info(
        `Creating relationship: missionary ${missionaryId} -> interested ${interestedId}`
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

      // Verificar se pertencem à mesma igreja (apenas se ambos tiverem igreja definida)
      if (interested.church && missionary.church && interested.church !== missionary.church) {
        return sendError(res, 'Discipulado só pode acontecer entre membros da mesma igreja', 400);
      }

      const relationship = await relationshipRepo.create({
        interestedId,
        missionaryId,
        status: status || 'active',
        notes: notes ?? undefined,
      });

      sendSuccess(res, relationship, 201, 'Relacionamento criado');
    })
  );

  /**
   * @swagger
   * /api/relationships/{id}:
   *   delete:
   *     summary: Remove um relacionamento
   *     tags: [Relationships]
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
   *         description: Relacionamento removido
   *       404:
   *         description: Relacionamento não encontrado
   */
  app.delete(
    '/api/relationships/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);

      const deleted = await relationshipRepo.delete(id);

      if (!deleted) {
        return sendNotFound(res, 'Relacionamento');
      }

      sendSuccess(res, null, 200, 'Relacionamento removido');
    })
  );

  /**
   * @swagger
   * /api/relationships/interested/{interestedId}:
   *   get:
   *     summary: Lista relacionamentos de um interessado
   *     tags: [Relationships]
   *     parameters:
   *       - in: path
   *         name: interestedId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Relacionamentos do interessado
   */
  app.get(
    '/api/relationships/interested/:interestedId',
    asyncHandler(async (req: Request, res: Response) => {
      const interestedId = parseInt(req.params.interestedId);
      const relationships = await relationshipRepo.getByInterested(interestedId);
      sendSuccess(res, relationships);
    })
  );

  /**
   * @swagger
   * /api/relationships/missionary/{missionaryId}:
   *   get:
   *     summary: Lista relacionamentos de um missionário
   *     tags: [Relationships]
   *     parameters:
   *       - in: path
   *         name: missionaryId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Relacionamentos do missionário
   */
  app.get(
    '/api/relationships/missionary/:missionaryId',
    asyncHandler(async (req: Request, res: Response) => {
      const missionaryId = parseInt(req.params.missionaryId);
      const requestingUserId = getAuthUserId(req);

      // Verificar permissões de acesso
      if (requestingUserId) {
        const requestingUser = await userRepo.getUserById(requestingUserId);
        const missionary = await userRepo.getUserById(missionaryId);

        if (!missionary) {
          return sendNotFound(res, 'Missionário');
        }

        if (requestingUser && !isSuperAdmin(requestingUser)) {
          // Usuário só pode ver seus próprios relacionamentos ou se for do mesmo distrito (pastor)
          if (requestingUser.id !== missionaryId) {
            // Se for pastor, verificar se o missionário pertence ao mesmo distrito
            if (requestingUser.role === 'pastor' && requestingUser.districtId) {
              if (missionary.districtId !== requestingUser.districtId) {
                logger.warn(
                  `🚫 Pastor ${requestingUser.email} tentou acessar relacionamentos de missionário de outro distrito`
                );
                return res.status(403).json({
                  error: 'Acesso negado',
                  message:
                    'Você não tem permissão para acessar relacionamentos de missionários de outros distritos',
                });
              }
            } else {
              // Se não for pastor/super admin, só pode ver seus próprios relacionamentos
              logger.warn(
                `🚫 Usuário ${requestingUser.email} tentou acessar relacionamentos de outro usuário`
              );
              return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você não tem permissão para acessar relacionamentos de outros usuários',
              });
            }
          }
        }
      }

      const relationships = await relationshipRepo.getByMissionary(missionaryId);
      sendSuccess(res, relationships);
    })
  );

  /**
   * @swagger
   * /api/relationships/active/{interestedId}:
   *   delete:
   *     summary: Remove relacionamento ativo de um interessado
   *     tags: [Relationships]
   *     security:
   *       - userId: []
   *     parameters:
   *       - in: path
   *         name: interestedId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Relacionamento removido
   */
  app.delete(
    '/api/relationships/active/:interestedId',
    asyncHandler(async (req: Request, res: Response) => {
      const interestedId = parseInt(req.params.interestedId);

      // Buscar relacionamentos ativos
      const relationships = await relationshipRepo.getByInterested(interestedId);
      const activeRelationship = relationships.find(
        (r: { status?: string }) => r.status === 'active'
      );

      if (!activeRelationship) {
        return sendNotFound(res, 'Relacionamento ativo');
      }

      await relationshipRepo.delete(activeRelationship.id);
      sendSuccess(res, null, 200, 'Relacionamento ativo removido');
    })
  );
};
