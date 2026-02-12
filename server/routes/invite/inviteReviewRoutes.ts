/**
 * Invite Review Routes - Superadmin review endpoints
 *
 * - POST /api/invites/:id/approve (approve invite)
 * - POST /api/invites/:id/reject (reject invite)
 */

import { type Express, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../neonConfig';
import { pastorInvites } from '../../schema';
import { requireAuth } from '../../middleware';
import { type AuthenticatedRequest } from '../../types';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../utils';
import {
  type OnboardingData,
  type RejectInviteDTO,
  type ApproveInviteResponse,
} from '../../types/pastor-invite.types';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { processOnboarding } from '../../services/onboardingService';

export const inviteReviewRoutes = (app: Express): void => {
  /**
   * POST /api/invites/:id/approve - Aprovar convite (Superadmin)
   */
  app.post(
    '/api/invites/:id/approve',
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

      if (!invite || invite.status !== 'submitted') {
        sendError(res, 'Convite inválido ou não submetido', 400);
        return;
      }

      const data = invite.onboardingData as OnboardingData;

      // Processar onboarding completo via serviço compartilhado
      const result = await processOnboarding(data);

      // Atualizar convite
      await db
        .update(pastorInvites)
        .set({
          status: 'approved',
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
          userId: result.userId,
          districtId: result.districtId,
          updatedAt: new Date(),
        })
        .where(eq(pastorInvites.id, invite.id));

      logger.info(`Convite aprovado: ${invite.email} -> user ${result.userId}, district ${result.districtId}`);

      const response: ApproveInviteResponse = {
        success: true,
        userId: result.userId,
        districtId: result.districtId,
      };

      sendSuccess(res, response);
    })
  );

  /**
   * POST /api/invites/:id/reject - Rejeitar convite (Superadmin)
   */
  app.post(
    '/api/invites/:id/reject',
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (req.user?.role !== 'superadmin') {
        sendError(res, 'Acesso negado', 403);
        return;
      }

      const inviteId = parseInt(req.params.id);
      const { reason, details }: RejectInviteDTO = req.body;

      if (!reason) {
        sendError(res, 'Motivo da rejeição é obrigatório', 400);
        return;
      }

      const invites = await db
        .select()
        .from(pastorInvites)
        .where(eq(pastorInvites.id, inviteId))
        .limit(1);

      const invite = invites[0];

      if (!invite || invite.status !== 'submitted') {
        sendError(res, 'Convite inválido ou não submetido', 400);
        return;
      }

      // Atualizar para rejeitado
      await db
        .update(pastorInvites)
        .set({
          status: 'rejected',
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
          rejectionReason: details || reason,
          updatedAt: new Date(),
        })
        .where(eq(pastorInvites.id, invite.id));

      logger.info(`Convite rejeitado: ${invite.email} - Motivo: ${reason}`);

      sendSuccess(res, { message: 'Convite rejeitado com sucesso' });
    })
  );
};
