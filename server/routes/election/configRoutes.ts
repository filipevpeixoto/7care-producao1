/**
 * Election Config Routes
 * Rotas para configuração de eleições
 * @module routes/election/configRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';

const electionLogger = logger;

const router = Router();

/**
 * @swagger
 * /api/elections/config:
 *   get:
 *     summary: Lista configurações de eleições
 *     tags: [Election Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de configurações
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    electionLogger.info('Listando configurações de eleição');
    // Implementação delegada ao electionRoutes.ts existente
    return sendSuccess(res, { message: 'Use /api/elections endpoint' });
  })
);

/**
 * @swagger
 * /api/elections/config/{id}:
 *   get:
 *     summary: Obtém configuração específica
 *     tags: [Election Config]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    electionLogger.info('Obtendo configuração de eleição', { id });
    return sendSuccess(res, { message: `Config ${id}` });
  })
);

export { router as configRoutes };
export default router;
