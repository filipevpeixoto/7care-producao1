/**
 * Relationship Routes Module
 * Endpoints relacionados a vínculos entre missionários e interessados
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createRelationshipSchema } from '../schemas';
import { hasAdminAccess } from '../utils/permissions';

export const relationshipRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

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
  app.get("/api/relationships", async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const userRole = req.headers['x-user-role'] as string;
      const missionaryIdFilter = req.query.missionaryId as string;
      
      let userChurch: string | null = null;
      const userIdNum = userId ? parseInt(userId) : null;
      
      // Se não for admin, filtrar por igreja do usuário
      if (!hasAdminAccess({ role: userRole as any }) && userId) {
        const currentUser = await storage.getUserById(parseInt(userId));
        if (currentUser?.church) {
          userChurch = currentUser.church;
        }
      }
      
      const relationships = await storage.getAllRelationships();

      // Enriquecer com dados dos usuários
      const enrichedRelationships = await Promise.all(
        relationships.map(async (rel: { interestedId?: number; missionaryId?: number }) => {
          const interested = rel.interestedId ? await storage.getUserById(rel.interestedId) : null;
          const missionary = rel.missionaryId ? await storage.getUserById(rel.missionaryId) : null;

          return {
            ...rel,
            interestedName: interested?.name || 'Desconhecido',
            missionaryName: missionary?.name || 'Desconhecido',
            interestedChurch: interested?.church || null,
            missionaryChurch: missionary?.church || null
          };
        })
      );
      
      // Filtrar por igreja se não for admin
      // MAS: sempre permitir que o usuário veja seus PRÓPRIOS relacionamentos (como missionário)
      let filteredRelationships = enrichedRelationships;
      if (userChurch && userIdNum) {
        filteredRelationships = enrichedRelationships.filter(
          (rel: any) => 
            // O usuário é o missionário deste relacionamento
            rel.missionaryId === userIdNum ||
            // OU o relacionamento envolve sua igreja
            rel.interestedChurch === userChurch || 
            rel.missionaryChurch === userChurch
        );
      }
      
      // Aplicar filtro de missionaryId se especificado na query
      if (missionaryIdFilter) {
        filteredRelationships = filteredRelationships.filter(
          (rel: any) => rel.missionaryId === parseInt(missionaryIdFilter)
        );
      }

      res.json(filteredRelationships);
    } catch (error) {
      handleError(res, error, "Get relationships");
    }
  });

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
  app.post("/api/relationships", validateBody(createRelationshipSchema), async (req: Request, res: Response) => {
    try {
      const { interestedId, missionaryId, status, notes } = (req as ValidatedRequest<typeof createRelationshipSchema._type>).validatedBody;
      logger.info(`Creating relationship: missionary ${missionaryId} -> interested ${interestedId}`);

      // Validar que ambos pertencem à mesma igreja
      const interested = await storage.getUserById(interestedId);
      const missionary = await storage.getUserById(missionaryId);

      if (!interested) {
        res.status(404).json({ error: 'Interessado não encontrado' }); return;
      }
      if (!missionary) {
        res.status(404).json({ error: 'Discipulador não encontrado' }); return;
      }

      // Verificar se pertencem à mesma igreja (apenas se ambos tiverem igreja definida)
      if (interested.church && missionary.church && interested.church !== missionary.church) {
        res.status(400).json({ 
          error: 'Discipulado só pode acontecer entre membros da mesma igreja',
          details: {
            interessadoIgreja: interested.church,
            discipuladorIgreja: missionary.church
          }
        }); 
        return;
      }

      const relationship = await storage.createRelationship({
        interestedId,
        missionaryId,
        status: status || 'active',
        notes: notes ?? undefined
      });

      res.status(201).json(relationship);
    } catch (error) {
      handleError(res, error, "Create relationship");
    }
  });

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
  app.delete("/api/relationships/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      const deleted = await storage.deleteRelationship(id);

      if (!deleted) {
        res.status(404).json({ error: 'Relacionamento não encontrado' }); return;
      }

      res.json({ success: true, message: 'Relacionamento removido' });
    } catch (error) {
      handleError(res, error, "Delete relationship");
    }
  });

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
  app.get("/api/relationships/interested/:interestedId", async (req: Request, res: Response) => {
    try {
      const interestedId = parseInt(req.params.interestedId);
      const relationships = await storage.getRelationshipsByInterested(interestedId);
      res.json(relationships);
    } catch (error) {
      handleError(res, error, "Get relationships by interested");
    }
  });

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
  app.get("/api/relationships/missionary/:missionaryId", async (req: Request, res: Response) => {
    try {
      const missionaryId = parseInt(req.params.missionaryId);
      const relationships = await storage.getRelationshipsByMissionary(missionaryId);
      res.json(relationships);
    } catch (error) {
      handleError(res, error, "Get relationships by missionary");
    }
  });

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
  app.delete("/api/relationships/active/:interestedId", async (req: Request, res: Response) => {
    try {
      const interestedId = parseInt(req.params.interestedId);

      // Buscar relacionamentos ativos
      const relationships = await storage.getRelationshipsByInterested(interestedId);
      const activeRelationship = relationships.find((r: { status?: string }) => r.status === 'active');

      if (!activeRelationship) {
        res.status(404).json({ error: 'Nenhum relacionamento ativo encontrado' }); return;
      }

      await storage.deleteRelationship(activeRelationship.id);
      res.json({ success: true, message: 'Relacionamento ativo removido' });
    } catch (error) {
      handleError(res, error, "Delete active relationship");
    }
  });
};
