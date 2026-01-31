/**
 * Election Candidate Routes
 * Rotas para gerenciamento de candidatos
 * @module routes/election/candidateRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';

const electionLogger = logger;

const router = Router();

/**
 * @swagger
 * /api/elections/candidates/{electionId}:
 *   get:
 *     summary: Lista candidatos de uma eleição
 *     tags: [Election Candidates]
 *     parameters:
 *       - in: path
 *         name: electionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de candidatos
 */
router.get(
  '/:electionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { electionId } = req.params;
    electionLogger.info('Listando candidatos', { electionId });
    return sendSuccess(res, { candidates: [], electionId });
  })
);

/**
 * @swagger
 * /api/elections/candidates/{electionId}:
 *   post:
 *     summary: Adiciona candidato à eleição
 *     tags: [Election Candidates]
 */
router.post(
  '/:electionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { electionId } = req.params;
    electionLogger.info('Adicionando candidato', { electionId, body: req.body });
    return sendCreated(res, { message: 'Candidato adicionado' });
  })
);

/**
 * @swagger
 * /api/elections/candidates/{electionId}/{candidateId}:
 *   delete:
 *     summary: Remove candidato da eleição
 *     tags: [Election Candidates]
 */
router.delete(
  '/:electionId/:candidateId',
  asyncHandler(async (req: Request, res: Response) => {
    const { electionId, candidateId } = req.params;
    electionLogger.info('Removendo candidato', { electionId, candidateId });
    return sendSuccess(res, { message: 'Candidato removido' });
  })
);

export { router as candidateRoutes };
export default router;
