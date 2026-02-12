/**
 * Invite CRUD Routes - Superadmin management
 *
 * - POST /api/invites (create invite)
 * - GET /api/invites (list all invites)
 * - GET /api/invites/:id (get invite details)
 */

import { type Express, type Response } from 'express';
import crypto from 'crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../neonConfig';
import { pastorInvites } from '../../schema';
import { requireAuth } from '../../middleware';
import { type AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../utils';
import {
  type CreateInviteDTO,
  type CreateInviteResponse,
} from '../../types/pastor-invite.types';
import { sendSuccess, sendError, sendNotFound } from '../../utils/apiResponse';

export const inviteCrudRoutes = (app: Express): void => {
  /**
   * POST /api/invites - Criar novo convite (Superadmin)
   */
  app.post(
    '/api/invites',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      // Verificar se é superadmin
      if (req.user?.role !== 'superadmin') {
        sendError(res, 'Acesso negado. Apenas superadmin pode criar convites.', 403);
        return;
      }

      const { email, expiresInDays = 7 }: CreateInviteDTO = req.body;

      if (!email) {
        sendError(res, 'Email é obrigatório', 400);
        return;
      }

      // Verificar se já existe convite pendente para este email
      const existingInvites = await db
        .select()
        .from(pastorInvites)
        .where(and(eq(pastorInvites.email, email), eq(pastorInvites.status, 'pending')))
        .limit(1);

      if (existingInvites.length > 0) {
        sendError(res, 'Já existe um convite pendente para este email', 400);
        return;
      }

      // Gerar token seguro
      const token = crypto.randomBytes(32).toString('hex');

      // Calcular data de expiração
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Criar convite
      const [invite] = await db
        .insert(pastorInvites)
        .values({
          token,
          email,
          createdBy: req.user.id,
          expiresAt,
          status: 'pending',
        })
        .returning();

      const link = `${process.env.APP_URL || 'http://localhost:5000'}/pastor-onboarding/${token}`;

      logger.info(`Convite criado para ${email} por ${req.user.email}`);

      const response: CreateInviteResponse = {
        token: invite.token,
        link,
        expiresAt: invite.expiresAt.toISOString(),
      };

      sendSuccess(res, response);
    })
  );

  /**
   * GET /api/invites - Listar convites (Superadmin)
   */
  app.get(
    '/api/invites',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (req.user?.role !== 'superadmin') {
        sendError(res, 'Acesso negado', 403);
        return;
      }

      const { status } = req.query;

      let invitesList;
      if (status) {
        invitesList = await db
          .select()
          .from(pastorInvites)
          .where(eq(pastorInvites.status, status as string))
          .orderBy(desc(pastorInvites.createdAt));
      } else {
        invitesList = await db.select().from(pastorInvites).orderBy(desc(pastorInvites.createdAt));
      }

      sendSuccess(res, { invites: invitesList });
    })
  );

  /**
   * GET /api/invites/:id - Detalhes de um convite (Superadmin)
   */
  app.get(
    '/api/invites/:id',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (req.user?.role !== 'superadmin') {
        sendError(res, 'Acesso negado', 403);
        return;
      }

      const inviteId = parseInt(req.params.id);

      const invites = await db
        .select()
        .from(pastorInvites)
        .where(eq(pastorInvites.id, inviteId))
        .limit(1);

      const invite = invites[0];

      if (!invite) {
        sendNotFound(res, 'Convite não encontrado');
        return;
      }

      sendSuccess(res, { invite });
    })
  );
};
