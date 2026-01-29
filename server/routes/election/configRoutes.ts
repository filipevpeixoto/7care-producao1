/**
 * Election Config Routes
 * Rotas para configuração de eleições
 * @module routes/election/configRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';

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
router.get('/', async (_req: Request, res: Response) => {
  try {
    electionLogger.info('Listando configurações de eleição');
    // Implementação delegada ao electionRoutes.ts existente
    res.json({ message: 'Use /api/elections endpoint' });
  } catch (error) {
    electionLogger.error('Erro ao listar configurações', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    electionLogger.info('Obtendo configuração de eleição', { id });
    res.json({ message: `Config ${id}` });
  } catch (error) {
    electionLogger.error('Erro ao obter configuração', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export { router as configRoutes };
export default router;
