/**
 * Discipleship Routes Module
 * Endpoints relacionados a pedidos de discipulado
 */

import { Express, Request, Response } from 'express';
import { NeonAdapter } from '../neonAdapter';
import { handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { createDiscipleshipRequestSchema } from '../schemas';
import { hasAdminAccess } from '../utils/permissions';

export const discipleshipRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

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
  app.get("/api/discipleship-requests", async (req: Request, res: Response) => {
    try {
      const { missionaryId, status } = req.query;
      const userId = req.headers['x-user-id'] as string;
      const userRole = req.headers['x-user-role'] as string;
      
      let userChurch: string | null = null;
      
      // Se não for admin, filtrar por igreja do usuário
      if (!hasAdminAccess({ role: userRole }) && userId) {
        const currentUser = await storage.getUserById(parseInt(userId));
        if (currentUser?.church) {
          userChurch = currentUser.church;
        }
      }
      
      let requests = await storage.getAllDiscipleshipRequests();

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
          const interested = req.interestedId ? await storage.getUserById(req.interestedId) : null;
          const missionary = req.missionaryId ? await storage.getUserById(req.missionaryId) : null;

          return {
            ...req,
            interestedName: interested?.name || 'Desconhecido',
            missionaryName: missionary?.name || 'Desconhecido',
            interestedChurch: interested?.church || null,
            missionaryChurch: missionary?.church || null
          };
        })
      );
      
      // Filtrar por igreja se não for admin
      let filteredRequests = enrichedRequests;
      if (userChurch) {
        filteredRequests = enrichedRequests.filter(
          (req: any) => req.interestedChurch === userChurch || req.missionaryChurch === userChurch
        );
      }

      res.json(filteredRequests);
    } catch (error) {
      handleError(res, error, "Get discipleship requests");
    }
  });

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
  app.post("/api/discipleship-requests", validateBody(createDiscipleshipRequestSchema), async (req: Request, res: Response) => {
    try {
      const { interestedId, missionaryId, notes } = (req as ValidatedRequest<typeof createDiscipleshipRequestSchema._type>).validatedBody;
      logger.info(`Creating discipleship request: missionary ${missionaryId} -> interested ${interestedId}`);

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

      // Verificar se já existe um pedido pendente
      const existingRequests = await storage.getAllDiscipleshipRequests();
      const hasPending = existingRequests.some((r: { interestedId?: number; missionaryId?: number; status?: string }) =>
        r.interestedId === interestedId &&
        r.missionaryId === missionaryId &&
        r.status === 'pending'
      );

      if (hasPending) {
        res.status(400).json({ error: 'Já existe um pedido pendente para este interessado' }); return;
      }

      const request = await storage.createDiscipleshipRequest({
        interestedId,
        missionaryId,
        status: 'pending',
        notes: notes ?? undefined
      });

      res.status(201).json(request);
    } catch (error) {
      handleError(res, error, "Create discipleship request");
    }
  });

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
  app.put("/api/discipleship-requests/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;

      const request = await storage.updateDiscipleshipRequest(id, { status, notes });

      if (!request) {
        res.status(404).json({ error: 'Pedido não encontrado' }); return;
      }

      // Se aprovado, criar relacionamento
      if (status === 'approved' && request.interestedId && request.missionaryId) {
        await storage.createRelationship({
          interestedId: request.interestedId,
          missionaryId: request.missionaryId,
          status: 'active',
          notes: `Vínculo criado a partir do pedido de discipulado #${id}`
        });
      }

      res.json(request);
    } catch (error) {
      handleError(res, error, "Update discipleship request");
    }
  });

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
  app.delete("/api/discipleship-requests/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDiscipleshipRequest(id);
      res.json({ success: true, message: 'Pedido removido' });
    } catch (error) {
      handleError(res, error, "Delete discipleship request");
    }
  });

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
  app.post("/api/users/:id(\\d+)/disciple", async (req: Request, res: Response) => {
    try {
      const interestedId = parseInt(req.params.id);
      const { missionaryId } = req.body;

      if (!missionaryId) {
        res.status(400).json({ error: 'ID do missionário é obrigatório' }); return;
      }

      // Verificar se já existe relacionamento ativo
      const existingRelationships = await storage.getRelationshipsByInterested(interestedId);
      const hasActive = existingRelationships.some((r: { status?: string }) => r.status === 'active');

      if (hasActive) {
        res.status(400).json({ error: 'Interessado já possui um missionário vinculado' }); return;
      }

      const relationship = await storage.createRelationship({
        interestedId,
        missionaryId,
        status: 'active',
        notes: 'Vínculo criado diretamente'
      });

      res.status(201).json(relationship);
    } catch (error) {
      handleError(res, error, "Create direct discipleship");
    }
  });
};
