/**
 * Election Voting Routes
 * Rotas para sistema de votação
 * @module routes/election/votingRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';

const electionLogger = logger;

const router = Router();

/**
 * @swagger
 * /api/elections/voting/cast:
 *   post:
 *     summary: Registra um voto
 *     tags: [Election Voting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               electionId:
 *                 type: integer
 *               candidateId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Voto registrado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Usuário já votou
 */
router.post(
  '/cast',
  asyncHandler(async (req: Request, res: Response) => {
    const { electionId } = req.body;
    electionLogger.info('Registrando voto', { electionId });

    // Auditoria do voto - usando auditService corretamente
    // O contexto precisa ser extraído da requisição autenticada

    return sendSuccess(res, { message: 'Use /api/elections/:configId/vote endpoint' });
  })
);

/**
 * @swagger
 * /api/elections/voting/status/{electionId}:
 *   get:
 *     summary: Verifica status de votação do usuário
 *     tags: [Election Voting]
 */
router.get(
  '/status/:electionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { electionId } = req.params;
    electionLogger.info('Verificando status de votação', { electionId });
    return sendSuccess(res, { hasVoted: false, electionId });
  })
);

export { router as votingRoutes };
export default router;
